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
from typing import Optional
from fastapi import FastAPI, Request
from .message_handler import handle_message

app = FastAPI()

VERIFY_TOKEN = os.getenv("VERIFY_TOKEN", "tuyensinh2026")

@app.get("/")
def health_check():
    return {"status": "ok"}

@app.get("/webhook")
def verify_webhook(
    hub_mode: Optional[str] = None,
    hub_verify_token: Optional[str] = None,
    hub_challenge: Optional[str] = None
):
    if hub_mode == "subscribe" and hub_verify_token == VERIFY_TOKEN:
        return int(hub_challenge) if hub_challenge is not None else 0

    return {"error": "Verification failed"}

@app.post("/webhook")
async def webhook_endpoint(request: Request):
    """
    Handle incoming webhooks from Messenger.
    Remember to always return a response quickly `{ "status": "ok" }`.
    """
    # 1. Verify Signature here
    # 2. Extract sender ID and message content
    # 3. Call message handler asynchronously or in background task
    # 4. Return {"status": "ok"} immediately to prevent retries
    return {"status": "ok"}
