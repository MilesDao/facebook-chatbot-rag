"""
Webhook Server (FastAPI)

Responsibilities:
- Receive incoming messages from Messenger
- Extract sender ID and message content
- Call the message handler
- Send response back to Messenger
- Return a quick acknowledgment

Important: Keep lightweight. All logic goes into message_handler.py.
"""

import os
import requests
from typing import Optional
from fastapi import FastAPI, Request, BackgroundTasks, Response
from dotenv import load_dotenv

# Load environment variables early
load_dotenv()

from .message_handler import handle_message

app = FastAPI()

VERIFY_TOKEN = os.getenv("VERIFY_TOKEN", "tuyensinh2026")
PAGE_ACCESS_TOKEN = os.getenv("PAGE_ACCESS_TOKEN", "")

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

@app.get("/")
def health_check():
    return {"status": "ok"}

@app.get("/webhook")
def verify_webhook(request: Request):
    # Lấy các tham số dạng hub.mode, hub.verify_token, hub.challenge
    hub_mode = request.query_params.get("hub.mode") or request.query_params.get("hub_mode")
    hub_verify_token = request.query_params.get("hub.verify_token") or request.query_params.get("hub_verify_token")
    hub_challenge = request.query_params.get("hub.challenge") or request.query_params.get("hub_challenge")

    if hub_mode == "subscribe" and hub_verify_token == VERIFY_TOKEN:
        return Response(content=hub_challenge, media_type="text/plain")

    return {"error": "Verification failed"}

@app.post("/webhook")
async def webhook_endpoint(request: Request, background_tasks: BackgroundTasks):
    """
    Handle incoming webhooks from Messenger.
    """
    try:
        body = await request.json()
        
        if body.get("object") == "page":
            for entry in body.get("entry", []):
                for msg in entry.get("messaging", []):
                    sender_id = msg.get("sender", {}).get("id")
                    message = msg.get("message", {})
                    user_text = message.get("text")
                    
                    if sender_id and user_text:
                        # Process in background task to return 200 OK immediately
                        background_tasks.add_task(process_message, sender_id, user_text)
    except Exception as e:
        print(f"Error processing webhook: {e}")

    return {"status": "ok"}

def process_message(sender_id: str, user_text: str):
    """Generate reply and send it back."""
    # Hiển thị icon thao tác: Đã xem và Đang gõ
    send_action(sender_id, "mark_seen")
    send_action(sender_id, "typing_on")
    
    reply = handle_message(sender_id, user_text)
    send_message(sender_id, reply)
