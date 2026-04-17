import os
import requests
import shutil
import time
from typing import List, Optional
from fastapi import FastAPI, Request, BackgroundTasks, Response, HTTPException, File, Form, UploadFile, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from .auth import get_current_user

# Load environment variables early
load_dotenv()

from .message_handler import handle_message
from .openrouter_integration import generate_response
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

class FAQCreate(BaseModel):
    keyword: str
    question: Optional[str] = ""
    answer: str

from pydantic import BaseModel, Field

class BotSettingsUpdate(BaseModel):
    page_access_token: str = Field(..., min_length=20)
    openrouter_api_key: str = Field(..., min_length=15)
    page_id: str = Field(..., min_length=10, pattern=r"^\d+$")
    verify_token: Optional[str] = Field("tuyensinh2026", min_length=5)
    llm_model: Optional[str] = Field("openai/gpt-oss-120b:free")
    app_secret: Optional[str] = Field(None, min_length=32, max_length=32)

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

    if hub_mode != "subscribe":
        return {"error": "Invalid hub.mode"}

    # 1. Check global default first (fallback)
    if hub_verify_token == VERIFY_TOKEN:
        return Response(content=hub_challenge, media_type="text/plain")

    # 2. Check Database for any user with this verify_token
    from .database import supabase
    try:
        response = supabase.table("bot_settings").select("id").eq("verify_token", hub_verify_token).limit(1).execute()
        if response.data:
            return Response(content=hub_challenge, media_type="text/plain")
    except Exception as e:
        print(f"Error verifying token in database: {e}")

    return {"error": "Verification failed"}

@app.post("/webhook")
async def webhook_endpoint(request: Request, background_tasks: BackgroundTasks):
    try:
        body = await request.json()
        if body.get("object") == "page":
            for entry in body.get("entry", []):
                page_id = entry.get("id")
                for msg in entry.get("messaging", []):
                    sender_id = msg.get("sender", {}).get("id")
                    message = msg.get("message", {})
                    user_text = message.get("text")
                    if sender_id and user_text:
                        background_tasks.add_task(process_message, sender_id, user_text, page_id)
    except Exception as e:
        print(f"Error processing webhook: {e}")
    return {"status": "ok"}

def process_message(sender_id: str, user_message: str, page_id: str):
    """
    Process message for a specific Page ID (multi-tenant)
    """
    print(f"--- Processing message from {sender_id} for Page {page_id} ---")
    
    # 1. Fetch settings for this Page ID
    from .database import supabase
    settings = {}
    try:
        response = supabase.table("bot_settings").select("*").eq("page_id", page_id).limit(1).execute()
        if response.data:
            settings = response.data[0]
            print(f"Settings found in DB for Page {page_id}")
        else:
            print(f"WARNING: No settings found in DB for Page {page_id}")
    except Exception as e:
        print(f"ERROR fetching settings for page {page_id}: {e}")

    token = settings.get("page_access_token") or os.getenv("PAGE_ACCESS_TOKEN")
    openrouter_key = settings.get("openrouter_api_key") or os.getenv("OPENROUTER_API_KEY")
    user_id = settings.get("user_id")

    if not token:
        print(f"CRITICAL: No access token available for page {page_id}. Aborting.")
        return

    # Helper function to send message using specific token
    def send_fb(sender: str, text: str, fb_token: str):
        url = f"https://graph.facebook.com/v21.0/me/messages?access_token={fb_token}"
        try:
            res = requests.post(url, json={"recipient": {"id": sender}, "message": {"text": text}})
            res.raise_for_status()
            print(f"Successfully sent reply to {sender}")
        except Exception as e:
            print(f"Error sending reply to {sender}: {e}")

    # Helper function to send typing action
    def send_fb_action(sender: str, action: str, fb_token: str):
        url = f"https://graph.facebook.com/v21.0/me/messages?access_token={fb_token}"
        requests.post(url, json={"recipient": {"id": sender}, "sender_action": action})

    print("Sending mark_seen and typing_on...")
    send_fb_action(sender_id, "mark_seen", token)
    send_fb_action(sender_id, "typing_on", token)
    
    try:
        # Fetch llm_model from settings
        llm_model = settings.get("llm_model") or "openai/gpt-oss-120b:free"
        print(f"Generating AI response for: {user_message[:50]}... using model {llm_model}")
        # Update handle_message to accept our parameters
        reply = handle_message(sender_id, user_message, user_id=user_id, openrouter_key=openrouter_key, llm_model=llm_model)
        print(f"AI Response generated: {reply[:50]}...")
    except Exception as e:
        print(f"ERROR in handle_message flow: {e}")
        reply = "I'm sorry, I encountered an error processing your request."

    send_fb(sender_id, reply, token)
    print(f"--- Finished processing {sender_id} ---")

# --- Admin API Endpoints ---

@app.post("/api/upload")
async def upload_files(files: List[UploadFile] = File(...)):
    """Upload documents to the raw_data directory."""
    uploaded_files = []
    try:
        for file in files:
            file_path = os.path.join(RAW_DATA_DIR, file.filename)
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            uploaded_files.append(file.filename)
        return {"filenames": uploaded_files, "status": "uploaded"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/index")
async def trigger_indexing(background_tasks: BackgroundTasks, current_user: dict = Depends(get_current_user)):
    """Trigger the RAG ingestion process in the background for the current user."""
    user_id = current_user["sub"]
    
    # Fetch user's OpenRouter key if available
    settings_res = supabase.table("bot_settings").select("openrouter_api_key").eq("user_id", user_id).limit(1).execute()
    openrouter_key = None
    if settings_res.data and settings_res.data[0].get("openrouter_api_key"):
        openrouter_key = settings_res.data[0]["openrouter_api_key"]

    def run_indexing():
        # Initialize service with user's key if they provided one
        service = IngestionService(api_key=openrouter_key)
        service.ingest_directory(RAW_DATA_DIR, user_id=user_id)
    
    background_tasks.add_task(run_indexing)
    return {"status": "indexing_started"}

@app.get("/api/sources")
async def get_sources():
    """Fetch list of uploaded raw source files."""
    try:
        files = []
        if os.path.exists(RAW_DATA_DIR):
            for filename in os.listdir(RAW_DATA_DIR):
                if os.path.isfile(os.path.join(RAW_DATA_DIR, filename)):
                    files.append({"id": filename, "name": filename})
        return files
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/sources/{filename}")
async def delete_source(filename: str):
    """Delete a raw source file and its embeddings from the database."""
    try:
        # Delete from disk
        file_path = os.path.join(RAW_DATA_DIR, filename)
        if os.path.exists(file_path):
            os.remove(file_path)
            
        # Delete from DB
        if supabase:
            supabase.table("documents").delete().contains("metadata", {"source": filename}).execute()
            
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/analytics")
async def get_analytics(current_user: dict = Depends(get_current_user)):
    """Fetch recent logs from Supabase for the current user."""
    user_id = current_user["sub"]
    if not supabase:
        raise HTTPException(status_code=500, detail="Database not configured")
    try:
        response = supabase.table("logs").select("*").eq("user_id", user_id).order("created_at", desc=True).limit(50).execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/handoffs")
async def get_handoffs(current_user: dict = Depends(get_current_user)):
    """Fetch all handoff requests for the current user."""
    user_id = current_user["sub"]
    if not supabase:
        raise HTTPException(status_code=500, detail="Database not configured")
    try:
        response = supabase.table("handoffs").select("*").eq("user_id", user_id).order("created_at", desc=True).limit(100).execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- Settings Management ---

@app.get("/api/settings")
async def get_bot_settings(current_user: dict = Depends(get_current_user)):
    """Fetch bot settings for the current user."""
    user_id = current_user["sub"]
    try:
        print(f"DEBUG: Fetching settings for user_id: {user_id}")
        response = supabase.table("bot_settings").select("*").eq("user_id", user_id).limit(1).execute()
        print(f"DEBUG: Fetch response data: {response.data}")
        if not response.data:
            # Create a default entry if not exists
            new_settings = {
                "user_id": user_id,
                "page_access_token": "",
                "openrouter_api_key": "",
                "page_id": "",
                "llm_model": "openai/gpt-oss-120b:free",
                "app_secret": ""
            }
            supabase.table("bot_settings").insert(new_settings).execute()
            return new_settings
        return response.data[0]
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"DEBUG: Database error in get_bot_settings: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@app.post("/api/settings")
async def update_bot_settings(settings: BotSettingsUpdate, current_user: dict = Depends(get_current_user)):
    """Update bot settings for the current user using upsert."""
    user_id = current_user["sub"]
    try:
        data = {
            "user_id": user_id,
            "page_access_token": settings.page_access_token,
            "openrouter_api_key": settings.openrouter_api_key,
            "page_id": settings.page_id,
            "verify_token": settings.verify_token,
            "llm_model": settings.llm_model or "openai/gpt-oss-120b:free",
            "app_secret": settings.app_secret,
            "updated_at": "now()"
        }
        # Use upsert to handle both insert and update
        response = supabase.table("bot_settings").upsert(data, on_conflict="user_id").execute()
        
        if hasattr(response, 'error') and response.error:
             raise HTTPException(status_code=500, detail=f"Supabase Error: {response.error.message}")
             
        print(f"Settings updated for user {user_id}")
        return {"status": "success", "data": response.data}
    except Exception as e:
        print(f"Error updating settings: {e}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@app.get("/api/handoffs/{handoff_id}/chat-link")
async def get_chat_link(handoff_id: str, current_user: dict = Depends(get_current_user)):
    """Fetch the direct Business Suite chat link for a conversation."""
    user_id = current_user["sub"]
    if not supabase:
        raise HTTPException(status_code=500, detail="Database not configured")
        
    try:
        # Fetch sender_id for this handoff (ensure it belongs to current user)
        response = supabase.table("handoffs").select("sender_id").eq("id", handoff_id).eq("user_id", user_id).execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Handoff not found or unauthorized")
            
        sender_id = response.data[0]["sender_id"]
        
        # Fetch user's token
        settings_res = supabase.table("bot_settings").select("page_access_token").eq("user_id", user_id).limit(1).execute()
        if not settings_res.data or not settings_res.data[0].get("page_access_token"):
            raise HTTPException(status_code=400, detail="Page Access Token not configured")
            
        token = settings_res.data[0]["page_access_token"]
        
        url = f"https://graph.facebook.com/v21.0/me/conversations?user_id={sender_id}&access_token={token}"
        r = requests.get(url)
        r.raise_for_status()
        data = r.json()
        
        if "data" in data and len(data["data"]) > 0:
            link = data["data"][0].get("link")
            if link:
                return {"status": "success", "link": link}
                
        return {"status": "success", "link": f"https://business.facebook.com/latest/inbox/all?selected_item_id={sender_id}"}
        
    except Exception as e:
        print(f"Error fetching chat link: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/handoffs/{handoff_id}/resolve")
async def resolve_handoff(handoff_id: str, current_user: dict = Depends(get_current_user)):
    """Mark a handoff as resolved for the current user."""
    user_id = current_user["sub"]
    if not supabase:
        raise HTTPException(status_code=500, detail="Database not configured")
    try:
        response = supabase.table("handoffs").update({"status": "resolved"}).eq("id", handoff_id).eq("user_id", user_id).execute()
        return {"status": "success", "data": response.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/faq")
async def get_faqs(current_user: dict = Depends(get_current_user)):
    """Fetch all FAQs for the current user."""
    user_id = current_user["sub"]
    from .services.faq_service import get_all_faqs
    return get_all_faqs(user_id=user_id)

@app.post("/api/faq")
async def create_faq(faq: FAQCreate, current_user: dict = Depends(get_current_user)):
    """Create a new FAQ for the current user."""
    user_id = current_user["sub"]
    from .services.faq_service import create_faq
    try:
        data = create_faq(faq.keyword, faq.question, faq.answer, user_id=user_id)
        return {"status": "success", "data": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/faq/{faq_id}")
async def delete_faq(faq_id: int, current_user: dict = Depends(get_current_user)):
    """Delete an FAQ by ID for the current user."""
    user_id = current_user["sub"]
    from .services.faq_service import delete_faq
    try:
        data = delete_faq(faq_id, user_id=user_id)
        return {"status": "success", "data": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/settings/{key}")
async def get_setting(key: str):
    """Get a specific setting value."""
    from .services.settings_service import SettingsService
    value = SettingsService.get_setting(key)
    if value is None:
        return {"value": None}
    return {"value": value}

@app.post("/api/settings")
async def update_setting(request: Request):
    """Update a setting."""
    from .services.settings_service import SettingsService, AppSetting
    try:
        body = await request.json()
        setting_key = body.get("setting_key")
        setting_value = body.get("setting_value")
        if not setting_key or not setting_value:
            raise HTTPException(status_code=400, detail="Missing key or value")
            
        setting = AppSetting(setting_key=setting_key, setting_value=setting_value)
        value = SettingsService.set_setting(setting)
        return {"status": "success", "value": value}
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
        return {"response": reply.answer}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)