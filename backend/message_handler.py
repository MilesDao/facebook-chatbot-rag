"""
Message Handler

Responsibilities:
- Central controller of the system
- Classify intent (Router)
- Retrieve relevant context from RAG (Supabase)
- Load & update conversation history
- Generate response using OpenRouter structured outputs
- Decide whether to trigger human handoff based on LLM flag
- Log interaction for analytics
"""

from .intent_router import classify_intent
from .rag_pipeline import retrieve_context
from .openrouter_integration import generate_response
from .services.history_service import add_message, get_history
from .services.flow_engine import process_flow_interaction
from .handoff import trigger_handoff
from .analytics import log_interaction

def handle_message(sender_id: str, user_message: str, workspace_id: str = None, openrouter_key: str = None, llm_model: str = "openai/gpt-oss-120b:free", system_prompt: str = None):
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
    intent = classify_intent(user_message, openrouter_key=openrouter_key)
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
            api_key=openrouter_key
        )
    
    # 4. Check confidence for handoff
    handoff_triggered = False
    if confidence_score < 0.3 and intent != "CHITCHAT":
        trigger_handoff(sender_id, user_message, confidence_score, workspace_id=workspace_id)
        handoff_triggered = True
        
    # 5. Generate Response using OpenRouter
    bot_res = generate_response(
        user_message, 
        context_str, 
        history, 
        openrouter_key=openrouter_key,
        llm_model=llm_model,
        custom_system_prompt=system_prompt
    )
    
    ai_reply = bot_res.answer
    
    # 6. Decide handoff if LLM flagged it
    if bot_res.needs_human and not handoff_triggered:
        trigger_handoff(sender_id, user_message, bot_res.confidence_score, workspace_id=workspace_id)
        handoff_triggered = True

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
