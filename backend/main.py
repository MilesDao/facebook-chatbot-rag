import os
import requests
import shutil
from typing import List, Optional
from fastapi import FastAPI, Request, BackgroundTasks, Response, HTTPException, File, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

# Load environment variables early
load_dotenv()

from .message_handler import handle_message
from .huggingface_integration import generate_response
from .database import supabase
from .services.ingestion import IngestionService

# Data directory
RAW_DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "raw_data")
os.makedirs(RAW_DATA_DIR, exist_ok=True)

class Message(BaseModel):
    role: str
    content: str

class GenerateRequest(BaseModel):
    user_message: str
    context: str = ""
    history: List[dict] = []

app = FastAPI(title="AI Messenger Bot - Backend API")

# Enable CORS for the Admin Dashboard
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict this to your dashboard URL
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
def health_check():
    return {"status": "ok", "service": "backend"}

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
                    if sender_id and user_text:
                        background_tasks.add_task(process_message, sender_id, user_text)
    except Exception as e:
        print(f"Error processing webhook: {e}")
    return {"status": "ok"}

def process_message(sender_id: str, user_text: str):
    send_action(sender_id, "mark_seen")
    send_action(sender_id, "typing_on")
    reply = handle_message(sender_id, user_text)
    send_message(sender_id, reply)

# --- Admin API Endpoints ---

@app.post("/api/upload")
async def upload_file(file: UploadFile = File(...)):
    """Upload a document to the raw_data directory."""
    try:
        file_path = os.path.join(RAW_DATA_DIR, file.filename)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        return {"filename": file.filename, "status": "uploaded"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/index")
async def trigger_indexing(background_tasks: BackgroundTasks):
    """Trigger the RAG ingestion process in the background."""
    def run_indexing():
        service = IngestionService()
        service.ingest_directory(RAW_DATA_DIR)
    
    background_tasks.add_task(run_indexing)
    return {"status": "indexing_started"}

@app.get("/api/analytics")
async def get_analytics():
    """Fetch recent logs from Supabase."""
    if not supabase:
        raise HTTPException(status_code=500, detail="Database not configured")
    try:
        response = supabase.table("logs").select("*").order("created_at", desc=True).limit(50).execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/handoffs")
async def get_handoffs():
    """Fetch active handoff requests."""
    if not supabase:
        raise HTTPException(status_code=500, detail="Database not configured")
    try:
        response = supabase.table("handoffs").select("*").eq("status", "active").order("created_at", desc=True).execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/generate")
async def generate(request: GenerateRequest):
    try:
        reply = generate_response(
            user_message=request.user_message,
            context=request.context,
            history=request.history
        )
        return {"response": reply}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
