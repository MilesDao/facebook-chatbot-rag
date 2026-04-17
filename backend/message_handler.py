"""
Message Handler

Responsibilities:
- Central controller of the system
- Classify intent (Router)
- Retrieve relevant context from RAG (Supabase)
- Load & update conversation history (Redis)
- Generate response using Gemini structured outputs
- Decide whether to trigger human handoff based on LLM flag
- Log interaction for analytics
"""

from .intent_router import classify_intent
from .rag_pipeline import retrieve_context
from .gemini_integration import generate_response
from .services.history_service import add_message, get_history # Tích hợp Redis vào đây
from .services import faq_service

def handle_message(sender_id: str, user_message: str, user_id: str = None, gemini_key: str = None):
    """
    Orchestrate the AI message flow.
    """
    # 1. Check FAQ Database first
    faq_answer = faq_service.search_faq(user_message, user_id=user_id)
    if faq_answer:
        # If match, return immediately and log it
        analytics.log_interaction(sender_id, user_message, faq_answer, 1.0, False, user_id=user_id)
        return faq_answer

    # 2. No history (Redis removed)
    formatted_history = []

    # 2. RAG retrieve from Supabase
    context_str, confidence_score = rag_pipeline.retrieve_context(
        user_message, 
        user_id=user_id, 
        gemini_key=gemini_key
    )
    
    # 3. Check context confidence for handoff
    handoff_triggered = False
    if confidence_score < 0.4 and context_str == "":
        handoff.trigger_handoff(sender_id, user_message, confidence_score, user_id=user_id)
        handoff_triggered = True
        
    # 4. Call Gemini if confident
    ai_reply = ChatGoogleGenerativeAI.generate_response(
        user_message, 
        context_str, 
        formatted_history, 
        api_key=gemini_key
    )
    
    # 5. Log analytics
    analytics.log_interaction(sender_id, user_message, ai_reply, confidence_score, handoff_triggered)
    
    # 6. (Memory saving removed)
    
    # 7. Return/Send response to Messenger
    return ai_reply
