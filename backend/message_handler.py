"""
Message Handler

Responsibilities:
- Central controller of the system
- Classify intent (Router)
- Retrieve relevant context from RAG (Supabase)
- Load & update conversation history
- Generate response using Google Gemini structured outputs
- Decide whether to trigger human handoff based on LLM flag
- Log interaction for analytics
"""

from .intent_router import classify_intent
from .rag_pipeline import retrieve_context
from .google_ai_integration import generate_response
from .services.history_service import add_message, get_history
from .services.flow_engine import process_flow_interaction
from .analytics import log_interaction
from .phone_detector import extract_phone_from_message
from .database import get_supabase_client

def handle_message(sender_id: str, user_message: str, workspace_id: str = None, google_key: str = None, llm_model: str = "gemini-3.1-flash-lite-preview", system_prompt: str = None):
    """
    Orchestrate the AI message flow:
    1. Try Visual Flow Engine first (Stateful)
    2. Fallback to RAG + Intent Classification (Stateless/Contextual)
    """
    # 0. EXTRACT VIETNAMESE PHONE NUMBER (if present)
    phone_number, phone_context = extract_phone_from_message(user_message)
    if phone_number and workspace_id and sender_id:
        try:
            _store_detected_phone(workspace_id, sender_id, phone_number, phone_context)
        except Exception as e:
            print(f"WARNING: Failed to store detected phone for {sender_id}: {e}")
    
    # 1. TRY FLOW ENGINE
    if workspace_id:
        flow_reply, handoff_triggered = process_flow_interaction(workspace_id, sender_id, user_message, google_key=google_key)
        
        # If handoff triggered, we MUST stop processing (AI is now paused for this user)
        if handoff_triggered:
            print(f"DEBUG: Handoff triggered for {sender_id}. Stopping AI response.")
            return flow_reply # May be None

        if flow_reply:
            print(f"DEBUG: Flow Engine handled message for {sender_id} (workspace: {workspace_id})")
            # Log and save to memory
            try:
                log_interaction(sender_id, user_message, flow_reply, 1.0, handoff_triggered, workspace_id=workspace_id)
            except Exception as e:
                print(f"ERROR: Failed to log flow interaction for {sender_id}: {e}")
            try:
                add_message(sender_id, role="user", content=user_message, workspace_id=workspace_id)
                add_message(sender_id, role="assistant", content=flow_reply, workspace_id=workspace_id)
            except Exception as e:
                print(f"ERROR: Failed to save flow history for {sender_id}: {e}")
            return flow_reply

    # 2. PHÂN LOẠI Ý ĐỊNH (Intent Classification) - Fallback
    intent = classify_intent(user_message, google_key=google_key)
    print(f"DEBUG: Intent for '{user_message[:20]}...' is {intent}")

    # 2. Load History
    history = []
    try:
        history = get_history(sender_id, limit=20, workspace_id=workspace_id)
    except Exception as e:
        print(f"Error loading history: {e}")

    # 3. Handle based on Intent
    context_str = ""
    confidence_score = 1.0
    
    if intent == "QA" or intent == "HANDOFF":
        # RAG retrieve from Supabase
        context_str, confidence_score = retrieve_context(
            user_message, 
            workspace_id=workspace_id, 
            api_key=google_key
        )
    
    # 4. Check confidence (Handoff deactivated)
    handoff_triggered = False
    # trigger_handoff calls removed per user request
        
    # 5. Generate Response using Google AI
    bot_res = generate_response(
        user_message, 
        context_str, 
        history, 
        google_key=google_key,
        llm_model=llm_model,
        custom_system_prompt=system_prompt
    )
    
    ai_reply = bot_res.answer
    
    # 6. Decide handoff (Handoff deactivated)
    # trigger_handoff calls removed per user request

    # 7. Log analytics
    try:
        log_interaction(sender_id, user_message, ai_reply, confidence_score, handoff_triggered, workspace_id=workspace_id)
    except Exception as e:
        print(f"Analytics Error: {e}")
    
    # 8. Save to Memory
    try:
        add_message(sender_id, role="user", content=user_message, workspace_id=workspace_id)
        add_message(sender_id, role="assistant", content=ai_reply, workspace_id=workspace_id)
    except Exception as e:
        print(f"Memory Error: {e}")
    
    return ai_reply


def _store_detected_phone(workspace_id: str, sender_id: str, phone_number: str, phone_context: dict):
    """Store detected phone number in conversation context."""
    try:
        supabase = get_supabase_client()
        
        # Get or create conversation context
        result = supabase.table("conversation_context").select("extracted_slots").eq(
            "workspace_id", workspace_id
        ).eq("sender_id", sender_id).execute()
        
        extracted_slots = {}
        if result.data and len(result.data) > 0:
            extracted_slots = result.data[0].get("extracted_slots", {})
        
        # Update extracted_slots with phone information
        extracted_slots["detected_phone"] = phone_number
        extracted_slots["phone"] = phone_number
        extracted_slots["has_phone"] = True
        extracted_slots["phone_context"] = phone_context
        
        # Prepare data payload
        payload = {
            "workspace_id": workspace_id,
            "sender_id": sender_id,
            "extracted_slots": extracted_slots
        }
        
        # Try to add new phone columns if migration was applied
        try:
            payload["detected_phone"] = phone_number
            payload["phone_confidence"] = phone_context.get("confidence", 0.0)
            payload["phone_triggered_by_keyword"] = phone_context.get("triggered_by_keyword", False)
        except Exception:
            # Migration not applied yet, continue with JSONB only
            pass

        # Update if exists, otherwise insert (avoids ON CONFLICT constraint requirement)
        if result.data and len(result.data) > 0:
            supabase.table("conversation_context").update(payload).eq(
                "workspace_id", workspace_id
            ).eq("sender_id", sender_id).execute()
        else:
            supabase.table("conversation_context").insert(payload).execute()
        
        print(f"DEBUG: Stored phone {phone_number} for sender {sender_id}")
    except Exception as e:
        # Don't raise - just log. Phone storage failure shouldn't break message flow
        print(f"WARNING: Could not store phone for {sender_id}: {e}")
        print(f"HINT: Ensure migration_phone_detection.sql has been applied to Supabase")
