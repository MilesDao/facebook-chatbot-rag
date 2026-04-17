"""
Message Handler

Responsibilities:
- Central controller of the system
- Classify intent (Router)
- Retrieve relevant context from RAG (Supabase)
- Load & update conversation history (Redis)
- Generate response using OpenRouter structured outputs
- Decide whether to trigger human handoff based on LLM flag
- Log interaction for analytics
"""

from .intent_router import classify_intent
from .rag_pipeline import retrieve_context
from .openrouter_integration import generate_response
from .services.history_service import add_message, get_history
from .services import faq_service
from .handoff import trigger_handoff
from .analytics import log_interaction

def handle_message(sender_id: str, user_message: str, user_id: str = None, openrouter_key: str = None, llm_model: str = "openai/gpt-oss-120b:free"):
    """
    Orchestrate the AI message flow using OpenRouter and semantic routing.
    """
    # 1. Classify Intent (Multi-tenant)
    intent = classify_intent(user_message, openrouter_key=openrouter_key)
    print(f"DEBUG: Intent for '{user_message[:20]}...' is {intent}")

    # 2. Check FAQ Database (High Priority)
    if intent == "FAQ": # Optional: Use router result to skip if not FAQ, but searching is fast anyway
        faq_answer = faq_service.search_faq(user_message, user_id=user_id)
        if faq_answer:
            log_interaction(sender_id, user_message, faq_answer, 1.0, False, user_id=user_id)
            return faq_answer

    # 3. Load History (Redis)
    history = []
    try:
        history = get_history(sender_id, limit=6)
    except Exception as e:
        print(f"Error loading history: {e}")

    # 4. Handle based on Intent
    context_str = ""
    confidence_score = 1.0
    
    if intent == "QA" or intent == "HANDOFF":
        # RAG retrieve from Supabase
        context_str, confidence_score = retrieve_context(
            user_message, 
            user_id=user_id, 
            api_key=openrouter_key
        )
    
    # 5. Check confidence for handoff
    handoff_triggered = False
    if confidence_score < 0.3 and intent != "CHITCHAT":
        trigger_handoff(sender_id, user_message, confidence_score, user_id=user_id)
        handoff_triggered = True
        
    # 6. Generate Response using OpenRouter
    bot_res = generate_response(
        user_message, 
        context_str, 
        history, 
        openrouter_key=openrouter_key,
        llm_model=llm_model
    )
    
    ai_reply = bot_res.answer
    
    # 7. Decide handoff if LLM flagged it
    if bot_res.needs_human and not handoff_triggered:
        trigger_handoff(sender_id, user_message, bot_res.confidence_score, user_id=user_id)
        handoff_triggered = True

    # 8. Log analytics
    try:
        log_interaction(sender_id, user_message, ai_reply, confidence_score, handoff_triggered, user_id=user_id)
    except Exception as e:
        print(f"Analytics Error: {e}")
    
    # 9. Save to Memory
    try:
        add_message(sender_id, role="user", content=user_message)
        add_message(sender_id, role="assistant", content=ai_reply)
    except Exception as e:
        print(f"Memory Error: {e}")
    
    return ai_reply
