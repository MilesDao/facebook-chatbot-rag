import os
import requests
import shutil
import time
from typing import List, Optional
from fastapi import FastAPI, Request, BackgroundTasks, Response, HTTPException, File, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

# Load environment variables early
load_dotenv()

from .message_handler import handle_message
from .gemini_integration import generate_response
from .database import supabase
from .services.ingestion import IngestionService

# Data directory
RAW_DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "raw_data")
os.makedirs(RAW_DATA_DIR, exist_ok=True)

# FIX: Set to store processed message IDs to prevent Facebook retry spam
processed_message_ids = set()

class Message(BaseModel):
    role: str
    content: str

class GenerateRequest(BaseModel):
    user_message: str
    context: str = ""
    history: List[dict] = []

class FAQCreate(BaseModel):
    keyword: str
    question: Optional[str] = ""
    answer: str

app = FastAPI(title="AI Messenger Bot - Backend API")

# Enable CORS for the Admin Dashboard
frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
origins = [
    "http://localhost:3000",
    frontend_url
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


VERIFY_TOKEN = os.getenv("VERIFY_TOKEN", "tuyensinh2026")
PAGE_ACCESS_TOKEN = os.getenv("PAGE_ACCESS_TOKEN", "")

# --- Messenger Utilities ---

def send_message(sender_id: str, text: str):
    """Send text message back to user via Messenger Graph API"""
    if not PAGE_ACCESS_TOKEN:
        print("Error: PAGE_ACCESS_TOKEN is missing")
        return
        
    url = f"https://graph.facebook.com/v21.0/me/messages?access_token={PAGE_ACCESS_TOKEN}"
    payload = {
        "recipient": {"id": sender_id},
        "message": {"text": text}
    }
    headers = {"Content-Type": "application/json"}
    try:
        response = requests.post(url, json=payload, headers=headers)
        response.raise_for_status()
    except Exception as e:
        print(f"Error sending message: {e}")

def send_action(sender_id: str, action: str):
    """Send sender action (mark_seen, typing_on, typing_off) back to user"""
    if not PAGE_ACCESS_TOKEN:
        print("Error: PAGE_ACCESS_TOKEN is missing")
        return
        
    url = f"https://graph.facebook.com/v21.0/me/messages?access_token={PAGE_ACCESS_TOKEN}"
    payload = {
        "recipient": {"id": sender_id},
        "sender_action": action
    }
    headers = {"Content-Type": "application/json"}
    try:
        response = requests.post(url, json=payload, headers=headers)
        response.raise_for_status()
    except Exception as e:
        print(f"Error sending action '{action}': {e}")

# --- Core Webhook Endpoints ---

@app.get("/")
@app.get("/health")
@app.get("/api/health")
def health_check():
    return {"status": "ok", "service": "backend", "origins": origins}


@app.get("/webhook")
def verify_webhook(request: Request):
    hub_mode = request.query_params.get("hub.mode") or request.query_params.get("hub_mode")
    hub_verify_token = request.query_params.get("hub.verify_token") or request.query_params.get("hub_verify_token")
    hub_challenge = request.query_params.get("hub.challenge") or request.query_params.get("hub_challenge")

    if hub_mode == "subscribe" and hub_verify_token == VERIFY_TOKEN:
        return Response(content=hub_challenge, media_type="text/plain")

    return {"error": "Verification failed"}

@app.post("/webhook")
async def webhook_endpoint(request: Request, background_tasks: BackgroundTasks):
    try:
        body = await request.json()
        if body.get("object") == "page":
            for entry in body.get("entry", []):
                for msg in entry.get("messaging", []):
                    sender_id = msg.get("sender", {}).get("id")
                    message = msg.get("message", {})
                    user_text = message.get("text")
                    
                    # FIX: Extract the unique message ID from Facebook payload
                    message_id = message.get("mid")

                    if sender_id and user_text and message_id:
                        
                        # FIX: Deduplication check to ignore retried requests from Facebook
                        if message_id in processed_message_ids:
                            print(f"Message {message_id} already processed. Ignoring retry.")
                            continue
                        
                        # FIX: Mark message as processed
                        processed_message_ids.add(message_id)
                        
                        background_tasks.add_task(process_message, sender_id, user_text)
    except Exception as e:
        print(f"Error processing webhook: {e}")
        
    # FIX: Return explicitly 200 OK string format preferred by FB instead of a JSON dict
    return Response(content="EVENT_RECEIVED", status_code=200)

def process_message(sender_id: str, user_text: str):
    # 1. Báo đã xem tin nhắn
    send_action(sender_id, "mark_seen")
    
    # 2. Lấy câu trả lời từ AI (lúc này nó đang chứa các cụm [SPLIT])
    ai_full_response = handle_message(sender_id, user_text)
    
    # 3. Tách chuỗi dựa trên từ khóa [SPLIT]
    messages = [msg.strip() for msg in ai_full_response.split("[SPLIT]") if msg.strip()]
    
    # 4. Gửi lần lượt từng tin nhắn
    for msg in messages:
        # Bật hiệu ứng đang gõ
        send_action(sender_id, "typing_on")
        
        # Tính toán thời gian giả lập gõ phím
        typing_time = len(msg) / 25.0 + 0.8 
        typing_time = min(typing_time, 4.0) # Gõ tối đa 4 giây để khách không đợi lâu
        
        # Dừng luồng một chút
        time.sleep(typing_time)
        
        # Gửi tin nhắn ra
        send_message(sender_id, msg)

# --- Admin API Endpoints ---

@app.post("/api/upload")
async def upload_file(file: UploadFile = File(...)):
    """Upload a document to the raw_data directory."""
    try:
        file_path = os.path.join(RAW_DATA_DIR, file.filename)
        with open