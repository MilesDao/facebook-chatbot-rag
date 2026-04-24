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

def handle_message(sender_id: str, user_message: str, workspace_id: str = None, google_key: str = None, llm_model: str = "gemini-3.1-flash-lite-preview", system_prompt: str = None):
    """
    Orchestrate the AI message flow:
    1. Try Visual Flow Engine first (Stateful)
    2. Fallback to RAG + Intent Classification (Stateless/Contextual)
    """
    # 1. TRY FLOW ENGINE
    if workspace_id:
        flow_reply = process_flow_interaction(workspace_id, sender_id, user_message)
        if flow_reply:
            print(f"DEBUG: Flow Engine handled message for {sender_id}")
            # Log and save to memory
            try:
                log_interaction(sender_id, user_message, flow_reply, 1.0, False, workspace_id=workspace_id)
                add_message(sender_id, role="user", content=user_message, workspace_id=workspace_id)
                add_message(sender_id, role="assistant", content=flow_reply, workspace_id=workspace_id)
            except: pass
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
