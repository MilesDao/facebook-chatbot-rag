import os
import re
import requests
import shutil
import time
from typing import List, Optional
from fastapi import FastAPI, Request, BackgroundTasks, Response, HTTPException, File, Form, UploadFile, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
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

# --- Pydantic Models ---

class Message(BaseModel):
    role: str
    content: str

class GenerateRequest(BaseModel):
    user_message: str
    context: str = ""
    history: List[dict] = []

class BotSettingsUpdate(BaseModel):
    page_access_token: str = Field(..., min_length=20)
    openrouter_api_key: str = Field(..., min_length=15)
    page_id: str = Field(..., min_length=10, pattern=r"^\d+$")
    verify_token: Optional[str] = Field("tuyensinh2026", min_length=5)
    llm_model: Optional[str] = Field("openai/gpt-oss-120b:free")
    app_secret: Optional[str] = Field(None, min_length=32, max_length=32)
    system_prompt: Optional[str] = Field(None)
    slot_definitions: Optional[str] = Field(None)  # JSON string

class WorkspaceCreate(BaseModel):
    name: str = Field(..., min_length=1)
    industry: str = Field("general")

class FlowCreate(BaseModel):
    name: str = Field(..., min_length=1)
    trigger_keywords: Optional[List[str]] = []
    is_default: Optional[bool] = False
    nodes: Optional[List[dict]] = None
    edges: Optional[List[dict]] = None

class FlowUpdate(BaseModel):
    name: Optional[str] = None
    trigger_keywords: Optional[List[str]] = None
    is_default: Optional[bool] = None
    is_active: Optional[bool] = None
    nodes: Optional[List[dict]] = None
    edges: Optional[List[dict]] = None

class FlowGraphSave(BaseModel):
    nodes: List[dict]
    edges: List[dict]


app = FastAPI(title="AI Messenger Bot - Multi-Tenant Backend API")

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


# ============================================================
# HELPER: Get workspace_id from request header or query param
# ============================================================

def get_workspace_id(request: Request, current_user: dict = Depends(get_current_user)) -> str:
    """Extract workspace_id from X-Workspace-Id header."""
    workspace_id = request.headers.get("x-workspace-id")
    if not workspace_id:
        raise HTTPException(status_code=400, detail="Missing X-Workspace-Id header")
    
    # Verify user has access to this workspace
    user_id = current_user["sub"]
    from .services.workspace_service import get_workspace
    ws = get_workspace(workspace_id, user_id)
    if not ws:
        raise HTTPException(status_code=403, detail="Access denied to this workspace")
    
    return workspace_id


# ============================================================
# HEALTH CHECK
# ============================================================

@app.get("/")
@app.get("/health")
@app.get("/api/health")
def health_check():
    return {"status": "ok", "service": "backend", "origins": origins}


# ============================================================
# WORKSPACE ENDPOINTS
# ============================================================

@app.get("/api/workspaces")
async def list_workspaces(current_user: dict = Depends(get_current_user)):
    """List all workspaces the current user belongs to."""
    from .services.workspace_service import get_user_workspaces
    user_id = current_user["sub"]
    return get_user_workspaces(user_id)

@app.post("/api/workspaces")
async def create_workspace_endpoint(ws: WorkspaceCreate, current_user: dict = Depends(get_current_user)):
    """Create a new workspace with industry template."""
    from .services.workspace_service import create_workspace
    user_id = current_user["sub"]
    try:
        workspace = create_workspace(ws.name, ws.industry, user_id)
        return {"status": "success", "data": workspace}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/workspaces/{workspace_id}")
async def delete_workspace_endpoint(workspace_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a workspace permanently (owner only)."""
    from .services.workspace_service import delete_workspace
    user_id = current_user["sub"]
    success = delete_workspace(workspace_id, user_id)
    if not success:
        raise HTTPException(status_code=403, detail="Only owners can delete workspaces, or workspace not found")
    return {"status": "success"}

@app.get("/api/workspaces/{workspace_id}")
async def get_workspace_endpoint(workspace_id: str, current_user: dict = Depends(get_current_user)):
    """Get a single workspace."""
    from .services.workspace_service import get_workspace
    user_id = current_user["sub"]
    ws = get_workspace(workspace_id, user_id)
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
    return ws

@app.get("/api/workspaces/{workspace_id}/members")
async def list_workspace_members(workspace_id: str, current_user: dict = Depends(get_current_user)):
    """List members of a workspace."""
    from .services.workspace_service import get_workspace, get_workspace_members
    user_id = current_user["sub"]
    ws = get_workspace(workspace_id, user_id)
    if not ws:
        raise HTTPException(status_code=403, detail="Access denied")
    return get_workspace_members(workspace_id)

@app.delete("/api/workspaces/{workspace_id}/members/{member_user_id}")
async def remove_member(workspace_id: str, member_user_id: str, current_user: dict = Depends(get_current_user)):
    """Remove a member from workspace (owner/admin only)."""
    from .services.workspace_service import get_workspace, remove_workspace_member
    user_id = current_user["sub"]
    ws = get_workspace(workspace_id, user_id)
    if not ws or ws.get("user_role") not in ("owner", "admin"):
        raise HTTPException(status_code=403, detail="Only owners and admins can remove members")
    remove_workspace_member(workspace_id, member_user_id)
    return {"status": "success"}

@app.get("/api/industry-templates")
async def list_industry_templates(current_user: dict = Depends(get_current_user)):
    """List all available industry templates."""
    from .services.workspace_service import get_industry_templates
    return get_industry_templates()


# ============================================================
# FACEBOOK WEBHOOK ENDPOINTS
# ============================================================

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

    # 2. Check Database for any workspace with this verify_token
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
    Process message for a specific Page ID (multi-tenant, workspace-scoped)
    """
    print(f"--- Processing message from {sender_id} for Page {page_id} ---")
    
    # 1. Fetch settings for this Page ID (workspace-scoped)
    settings = {}
    workspace_id = None
    try:
        response = supabase.table("bot_settings").select("*").eq("page_id", page_id).limit(1).execute()
        if response.data:
            settings = response.data[0]
            workspace_id = settings.get("workspace_id")
            print(f"Settings found in DB for Page {page_id} (workspace: {workspace_id})")
        else:
            print(f"WARNING: No settings found in DB for Page {page_id}")
    except Exception as e:
        print(f"ERROR fetching settings for page {page_id}: {e}")

    token = settings.get("page_access_token")
    openrouter_key = settings.get("openrouter_api_key")

    if not token:
        print(f"CRITICAL: No access token available for page {page_id}. Aborting.")
        return
        
    if not openrouter_key:
        print(f"WARNING: No OpenRouter API Key available for page {page_id}.")
    else:
        print(f"DEBUG: Using OpenRouter Key (Redacted: {openrouter_key[:6]}...)")

    # Check if this sender is paused (admin took over)
    try:
        pause_check = supabase.table("paused_senders").select("id").eq("workspace_id", workspace_id).eq("sender_id", sender_id).limit(1).execute()
        if pause_check.data:
            print(f"PAUSED: Sender {sender_id} is paused for workspace {workspace_id}. Skipping AI response.")
            return
    except Exception as e:
        print(f"Error checking pause status: {e}")

    # Helper functions
    def send_fb(sender: str, text: str, fb_token: str):
        url = f"https://graph.facebook.com/v21.0/me/messages?access_token={fb_token}"
        try:
            res = requests.post(url, json={"recipient": {"id": sender}, "message": {"text": text}})
            res.raise_for_status()
            print(f"Successfully sent reply to {sender}")
        except Exception as e:
            msg = f"Error sending reply to {sender}: {e}"
            if hasattr(e, 'response') and e.response is not None:
                msg += f" | Body: {e.response.text}"
            print(msg)

    def send_fb_attachment(sender: str, file_url: str, fb_token: str):
        ext = file_url.rsplit('.', 1)[-1].lower() if '.' in file_url else ''
        if ext in ('png', 'jpg', 'jpeg', 'gif', 'webp'):
            att_type = 'image'
        elif ext in ('mp4', 'mov', 'avi'):
            att_type = 'video'
        elif ext in ('mp3', 'wav', 'ogg'):
            att_type = 'audio'
        else:
            att_type = 'file'
        
        url = f"https://graph.facebook.com/v21.0/me/messages?access_token={fb_token}"
        payload = {
            "recipient": {"id": sender},
            "message": {
                "attachment": {
                    "type": att_type,
                    "payload": {"url": file_url, "is_reusable": True}
                }
            }
        }
        try:
            res = requests.post(url, json=payload)
            res.raise_for_status()
        except Exception as e:
            print(f"Error sending attachment to {sender}: {e}")

    def send_fb_action(sender: str, action: str, fb_token: str):
        url = f"https://graph.facebook.com/v21.0/me/messages?access_token={fb_token}"
        try:
            res = requests.post(url, json={"recipient": {"id": sender}, "sender_action": action})
            res.raise_for_status()
        except Exception as e:
            print(f"Error sending action '{action}' to {sender}: {e}")

    print("Sending mark_seen and typing_on...")
    send_fb_action(sender_id, "mark_seen", token)
    send_fb_action(sender_id, "typing_on", token)
    
    try:
        llm_model = settings.get("llm_model") or "openai/gpt-oss-120b:free"
        system_prompt = settings.get("system_prompt")
        print(f"Generating AI response for: {user_message[:50]}... using model {llm_model}")
        
        reply = handle_message(
            sender_id, 
            user_message, 
            workspace_id=workspace_id, 
            openrouter_key=openrouter_key, 
            llm_model=llm_model,
            system_prompt=system_prompt
        ) or ""
        
        if not reply.strip():
            print("WARNING: AI returned empty reply. Using fail-safe.")
            reply = "Dạ mình chưa tìm thấy thông tin này [SPLIT] Bạn có thể hỏi cụ thể hơn được không ạ?"
            
        print(f"AI Response generated: {reply[:50]}...")
    except Exception as e:
        print(f"ERROR in handle_message flow: {e}")
        reply = "Dạ mình đang gặp một chút sự cố kỹ thuật [SPLIT] Bạn vui lòng nhắn lại sau ít phút nhé ạ."

    # Handle [SPLIT] tag and send multiple bubbles
    parts = [p.strip() for p in reply.split("[SPLIT]") if p.strip()]
    if not parts:
        parts = ["Dạ mình đã nhận được thông tin, mình sẽ phản hồi bạn sớm nhé ạ."]

    for part in parts:
        file_urls = re.findall(r'\[FILE:(https?://[^\]]+)\]', part)
        clean_text = re.sub(r'\s*\[FILE:https?://[^\]]+\]\s*', ' ', part).strip()
        
        if clean_text:
            send_fb(sender_id, clean_text, token)
            time.sleep(0.5)
        
        for file_url in file_urls:
            send_fb_attachment(sender_id, file_url, token)
            time.sleep(0.5)
        
        time.sleep(0.3)
    
    send_fb_action(sender_id, "typing_off", token)
    print(f"--- Finished processing {sender_id} ---")


# ============================================================
# ADMIN API: KNOWLEDGE BASE (workspace-scoped)
# ============================================================

@app.post("/api/upload")
async def upload_files(file: List[UploadFile] = File(...)):
    """Upload documents to the raw_data directory."""
    uploaded_files = []
    try:
        for f in file:
            file_path = os.path.join(RAW_DATA_DIR, f.filename)
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(f.file, buffer)
            uploaded_files.append(f.filename)
        return {"filenames": uploaded_files, "status": "uploaded"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/index")
async def trigger_indexing(request: Request, background_tasks: BackgroundTasks, current_user: dict = Depends(get_current_user)):
    """Trigger the RAG ingestion process in the background for the current workspace."""
    workspace_id = request.headers.get("x-workspace-id")
    if not workspace_id:
        raise HTTPException(status_code=400, detail="Missing X-Workspace-Id header")
    
    # Fetch workspace's OpenRouter key
    settings_res = supabase.table("bot_settings").select("openrouter_api_key").eq("workspace_id", workspace_id).limit(1).execute()
    openrouter_key = None
    if settings_res.data and settings_res.data[0].get("openrouter_api_key"):
        openrouter_key = settings_res.data[0]["openrouter_api_key"]

    def run_indexing():
        service = IngestionService(api_key=openrouter_key)
        service.ingest_directory(RAW_DATA_DIR, workspace_id=workspace_id)
    
    background_tasks.add_task(run_indexing)
    return {"status": "indexing_started"}

@app.get("/api/sources")
async def get_sources(request: Request, current_user: dict = Depends(get_current_user)):
    """Fetch list of successfully indexed sources from Supabase + local raw files."""
    workspace_id = request.headers.get("x-workspace-id")
    if not workspace_id:
        raise HTTPException(status_code=400, detail="Missing X-Workspace-Id header")
    
    sources_dict = {}
    try:
        if supabase:
            res = supabase.table("documents").select("metadata").eq("workspace_id", workspace_id).execute()
            for doc in res.data:
                src = doc.get("metadata", {}).get("source")
                if src:
                    sources_dict[src] = {"id": src, "name": src}
    except Exception as e:
        print(f"Error fetching indexed sources: {e}")

    try:
        if os.path.exists(RAW_DATA_DIR):
            for filename in os.listdir(RAW_DATA_DIR):
                if os.path.isfile(os.path.join(RAW_DATA_DIR, filename)):
                    if filename not in sources_dict:
                        sources_dict[filename] = {"id": filename, "name": filename}
    except Exception as e:
        print(f"Error listing local sources: {e}")
        
    return list(sources_dict.values())

@app.delete("/api/sources/{filename}")
async def delete_source(filename: str, request: Request, current_user: dict = Depends(get_current_user)):
    """Delete a raw source file and its embeddings from the database."""
    workspace_id = request.headers.get("x-workspace-id")
    if not workspace_id:
        raise HTTPException(status_code=400, detail="Missing X-Workspace-Id header")
    try:
        file_path = os.path.join(RAW_DATA_DIR, filename)
        if os.path.exists(file_path):
            os.remove(file_path)
            
        if supabase:
            supabase.table("documents").delete().eq("workspace_id", workspace_id).contains("metadata", {"source": filename}).execute()
            
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/sources/{filename}/content")
async def get_source_content(filename: str, current_user: dict = Depends(get_current_user)):
    """Return the content of a raw knowledge source file."""
    try:
        file_path = os.path.join(RAW_DATA_DIR, filename)
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="File not found")
            
        from fastapi.responses import FileResponse
        return FileResponse(file_path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# ADMIN API: ANALYTICS & HANDOFFS (workspace-scoped)
# ============================================================

@app.get("/api/analytics")
async def get_analytics(request: Request, current_user: dict = Depends(get_current_user)):
    """Fetch recent logs from Supabase for the current workspace."""
    workspace_id = request.headers.get("x-workspace-id")
    if not workspace_id:
        raise HTTPException(status_code=400, detail="Missing X-Workspace-Id header")
    if not supabase:
        raise HTTPException(status_code=500, detail="Database not configured")
    try:
        response = supabase.table("logs").select("*").eq("workspace_id", workspace_id).order("created_at", desc=True).limit(50).execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/handoffs")
async def get_handoffs(request: Request, current_user: dict = Depends(get_current_user)):
    """Fetch all handoff requests for the current workspace."""
    workspace_id = request.headers.get("x-workspace-id")
    if not workspace_id:
        raise HTTPException(status_code=400, detail="Missing X-Workspace-Id header")
    if not supabase:
        raise HTTPException(status_code=500, detail="Database not configured")
    try:
        response = supabase.table("handoffs").select("*").eq("workspace_id", workspace_id).order("created_at", desc=True).limit(100).execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/handoffs/{handoff_id}/chat-link")
async def get_chat_link(handoff_id: str, request: Request, current_user: dict = Depends(get_current_user)):
    """Fetch the direct Business Suite chat link for a conversation."""
    workspace_id = request.headers.get("x-workspace-id")
    if not workspace_id:
        raise HTTPException(status_code=400, detail="Missing X-Workspace-Id header")
    if not supabase:
        raise HTTPException(status_code=500, detail="Database not configured")
        
    try:
        response = supabase.table("handoffs").select("sender_id").eq("id", handoff_id).eq("workspace_id", workspace_id).execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Handoff not found or unauthorized")
            
        sender_id = response.data[0]["sender_id"]
        
        settings_res = supabase.table("bot_settings").select("page_access_token").eq("workspace_id", workspace_id).limit(1).execute()
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
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/handoffs/{handoff_id}/resolve")
async def resolve_handoff(handoff_id: str, request: Request, current_user: dict = Depends(get_current_user)):
    """Mark a handoff as resolved."""
    workspace_id = request.headers.get("x-workspace-id")
    if not workspace_id:
        raise HTTPException(status_code=400, detail="Missing X-Workspace-Id header")
    try:
        response = supabase.table("handoffs").update({"status": "resolved"}).eq("id", handoff_id).eq("workspace_id", workspace_id).execute()
        return {"status": "success", "data": response.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/handoffs/{handoff_id}/restore")
async def restore_handoff(handoff_id: str, request: Request, current_user: dict = Depends(get_current_user)):
    """Restore a resolved handoff back to active status."""
    workspace_id = request.headers.get("x-workspace-id")
    if not workspace_id:
        raise HTTPException(status_code=400, detail="Missing X-Workspace-Id header")
    try:
        response = supabase.table("handoffs").update({"status": "active"}).eq("id", handoff_id).eq("workspace_id", workspace_id).execute()
        return {"status": "success", "data": response.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/handoffs/{handoff_id}")
async def delete_handoff(handoff_id: str, request: Request, current_user: dict = Depends(get_current_user)):
    """Permanently delete a handoff."""
    workspace_id = request.headers.get("x-workspace-id")
    if not workspace_id:
        raise HTTPException(status_code=400, detail="Missing X-Workspace-Id header")
    try:
        response = supabase.table("handoffs").delete().eq("id", handoff_id).eq("workspace_id", workspace_id).execute()
        return {"status": "success", "data": response.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# ADMIN API: SETTINGS (workspace-scoped)
# ============================================================

@app.get("/api/settings")
async def get_bot_settings(request: Request, current_user: dict = Depends(get_current_user)):
    """Fetch bot settings for the current workspace."""
    workspace_id = request.headers.get("x-workspace-id")
    if not workspace_id:
        raise HTTPException(status_code=400, detail="Missing X-Workspace-Id header")
    try:
        response = supabase.table("bot_settings").select("*").eq("workspace_id", workspace_id).limit(1).execute()
        if not response.data:
            # Create default settings
            new_settings = {
                "workspace_id": workspace_id,
                "page_access_token": "",
                "openrouter_api_key": "",
                "page_id": "",
                "llm_model": "openai/gpt-oss-120b:free",
                "system_prompt": "",
                "slot_definitions": "[]"
            }
            supabase.table("bot_settings").insert(new_settings).execute()
            return new_settings
        return response.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@app.post("/api/settings")
async def update_bot_settings(settings: BotSettingsUpdate, request: Request, current_user: dict = Depends(get_current_user)):
    """Update bot settings for the current workspace."""
    workspace_id = request.headers.get("x-workspace-id")
    if not workspace_id:
        raise HTTPException(status_code=400, detail="Missing X-Workspace-Id header")
    try:
        data = {
            "workspace_id": workspace_id,
            "page_access_token": settings.page_access_token,
            "openrouter_api_key": settings.openrouter_api_key,
            "page_id": settings.page_id,
            "verify_token": settings.verify_token,
            "llm_model": settings.llm_model or "openai/gpt-oss-120b:free",
            "app_secret": settings.app_secret,
            "system_prompt": settings.system_prompt or "",
            "slot_definitions": settings.slot_definitions or "[]",
            "updated_at": "now()"
        }
        response = supabase.table("bot_settings").upsert(data, on_conflict="workspace_id").execute()
        
        if hasattr(response, 'error') and response.error:
             raise HTTPException(status_code=500, detail=f"Supabase Error: {response.error.message}")
             
        print(f"Settings updated for workspace {workspace_id}")
        return {"status": "success", "data": response.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


# ============================================================
# ADMIN API: PAUSED SENDERS (workspace-scoped)
# ============================================================

@app.get("/api/senders/paused")
async def get_paused_senders(request: Request, current_user: dict = Depends(get_current_user)):
    """Get list of paused sender IDs."""
    workspace_id = request.headers.get("x-workspace-id")
    if not workspace_id:
        raise HTTPException(status_code=400, detail="Missing X-Workspace-Id header")
    try:
        response = supabase.table("paused_senders").select("sender_id, paused_at").eq("workspace_id", workspace_id).execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/senders/{sender_id}/pause")
async def pause_sender(sender_id: str, request: Request, current_user: dict = Depends(get_current_user)):
    """Pause AI responses for a specific sender."""
    workspace_id = request.headers.get("x-workspace-id")
    if not workspace_id:
        raise HTTPException(status_code=400, detail="Missing X-Workspace-Id header")
    try:
        supabase.table("paused_senders").upsert(
            {"workspace_id": workspace_id, "sender_id": sender_id},
            on_conflict="workspace_id,sender_id"
        ).execute()
        return {"status": "success", "paused": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/senders/{sender_id}/pause")
async def resume_sender(sender_id: str, request: Request, current_user: dict = Depends(get_current_user)):
    """Resume AI responses for a specific sender."""
    workspace_id = request.headers.get("x-workspace-id")
    if not workspace_id:
        raise HTTPException(status_code=400, detail="Missing X-Workspace-Id header")
    try:
        supabase.table("paused_senders").delete().eq("workspace_id", workspace_id).eq("sender_id", sender_id).execute()
        return {"status": "success", "paused": False}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# ADMIN API: FACEBOOK UTILS (workspace-scoped)
# ============================================================

@app.post("/api/facebook/resolve-names")
async def resolve_facebook_names(request: Request, current_user: dict = Depends(get_current_user)):
    """Resolve Facebook PSIDs to real names using Graph API."""
    workspace_id = request.headers.get("x-workspace-id")
    if not workspace_id:
        return {"names": {}}
    
    body = await request.json()
    sender_ids = body.get("sender_ids", [])
    if not sender_ids:
        return {"names": {}}

    settings_res = supabase.table("bot_settings").select("page_access_token").eq("workspace_id", workspace_id).limit(1).execute()
    if not settings_res.data or not settings_res.data[0].get("page_access_token"):
        return {"names": {}}

    token = settings_res.data[0]["page_access_token"]
    names = {}

    for psid in sender_ids[:50]:
        try:
            url = f"https://graph.facebook.com/v21.0/{psid}?fields=first_name,last_name,profile_pic&access_token={token}"
            r = requests.get(url, timeout=5)
            if r.ok:
                data = r.json()
                first = data.get("first_name", "")
                last = data.get("last_name", "")
                names[psid] = {
                    "name": f"{first} {last}".strip() or psid,
                    "profile_pic": data.get("profile_pic", "")
                }
            else:
                names[psid] = {"name": psid, "profile_pic": ""}
        except Exception as e:
            names[psid] = {"name": psid, "profile_pic": ""}

    return {"names": names}


# ============================================================
# ADMIN API: MEDIA LIBRARY (workspace-scoped)
# ============================================================

@app.post("/api/media/upload")
async def upload_media(file: UploadFile = File(...), request: Request = None, current_user: dict = Depends(get_current_user)):
    """Upload a file to Supabase Storage."""
    workspace_id = request.headers.get("x-workspace-id") if request else current_user["sub"]
    try:
        content = await file.read()
        safe_name = re.sub(r'[^a-zA-Z0-9._-]', '_', file.filename)
        timestamp = int(time.time())
        unique_name = f"{timestamp}_{safe_name}"
        
        path = f"{workspace_id}/{unique_name}"
        
        supabase.storage.from_("media").upload(
            path=path,
            file=content,
            file_options={"content-type": file.content_type}
        )
        
        res = supabase.storage.from_("media").get_public_url(path)
        return {"url": res, "filename": unique_name}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/media")
async def list_media(request: Request, current_user: dict = Depends(get_current_user)):
    """List all media files for the current workspace."""
    workspace_id = request.headers.get("x-workspace-id") or current_user["sub"]
    try:
        files = supabase.storage.from_("media").list(workspace_id)
        
        result = []
        for f in files:
            path = f"{workspace_id}/{f['name']}"
            url = supabase.storage.from_("media").get_public_url(path)
            result.append({
                "name": f["name"],
                "url": url,
                "created_at": f.get("created_at"),
                "metadata": f.get("metadata")
            })
        
        result.sort(key=lambda x: x.get("created_at") or "", reverse=True)
        return result
    except Exception as e:
        return []

@app.delete("/api/media/{filename}")
async def delete_media(filename: str, request: Request, current_user: dict = Depends(get_current_user)):
    """Delete a media file."""
    workspace_id = request.headers.get("x-workspace-id") or current_user["sub"]
    try:
        path = f"{workspace_id}/{filename}"
        supabase.storage.from_("media").remove([path])
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# ADMIN API: CONVERSATION FLOWS (workspace-scoped)
# ============================================================

@app.get("/api/flows")
async def list_flows(request: Request, current_user: dict = Depends(get_current_user)):
    """List all flows for the current workspace."""
    workspace_id = request.headers.get("x-workspace-id")
    if not workspace_id:
        raise HTTPException(status_code=400, detail="Missing X-Workspace-Id header")
    try:
        res = supabase.table("conversation_flows").select("*").eq("workspace_id", workspace_id).order("created_at", desc=True).execute()
        return res.data or []
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/flows")
async def create_flow_endpoint(flow: FlowCreate, request: Request, current_user: dict = Depends(get_current_user)):
    """Create a new conversation flow."""
    workspace_id = request.headers.get("x-workspace-id")
    if not workspace_id:
        raise HTTPException(status_code=400, detail="Missing X-Workspace-Id header")
    from .services.flow_engine import create_flow, save_flow_graph
    try:
        # 1. Create flow metadata
        data = create_flow(workspace_id, flow.name, flow.trigger_keywords, flow.is_default)
        
        # 2. Save initial graph if provided
        if data and flow.nodes is not None and flow.edges is not None:
            save_flow_graph(data["id"], flow.nodes, flow.edges)
            
        return {"status": "success", "data": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/flows/{flow_id}")
async def get_flow(flow_id: str, current_user: dict = Depends(get_current_user)):
    """Get a single flow with all its nodes and edges."""
    from .services.flow_engine import get_flow_nodes, get_flow_edges
    try:
        flow_res = supabase.table("conversation_flows").select("*").eq("id", flow_id).limit(1).execute()
        if not flow_res.data:
            raise HTTPException(status_code=404, detail="Flow not found")
        
        flow = flow_res.data[0]
        flow["nodes"] = get_flow_nodes(flow_id)
        flow["edges"] = get_flow_edges(flow_id)
        return flow
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/flows/{flow_id}")
async def update_flow_endpoint(flow_id: str, flow: FlowUpdate, current_user: dict = Depends(get_current_user)):
    """Update flow metadata and optionally its graph."""
    from .services.flow_engine import update_flow, save_flow_graph
    try:
        # 1. Update metadata
        updates = {k: v for k, v in flow.model_dump().items() if v is not None and k not in ["nodes", "edges"]}
        if updates:
            updates["updated_at"] = "now()"
            update_flow(flow_id, updates)
        
        # 2. Update graph if provided
        if flow.nodes is not None and flow.edges is not None:
            save_flow_graph(flow_id, flow.nodes, flow.edges)
            
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/flows/{flow_id}")
async def delete_flow_endpoint(flow_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a flow and all its nodes/edges."""
    from .services.flow_engine import delete_flow
    try:
        delete_flow(flow_id)
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/flows/{flow_id}/graph")
async def save_flow_graph_endpoint(flow_id: str, graph: FlowGraphSave, current_user: dict = Depends(get_current_user)):
    """Save complete flow graph (nodes + edges)."""
    from .services.flow_engine import save_flow_graph
    try:
        save_flow_graph(flow_id, graph.nodes, graph.edges)
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# LEGACY / UTILITY ENDPOINTS
# ============================================================

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