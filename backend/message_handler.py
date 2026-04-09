"""
Message Handler

Responsibilities:
- Central controller of the system
- Retrieve relevant context from RAG (Supabase)
- Load conversation history from Redis
- Generate response using Gemini
- Decide whether to trigger human handoff
- Log interaction for analytics
- Update memory
"""

from . import rag_pipeline
from . import gemini_integration as ChatGoogleGenerativeAI
from . import handoff
from . import analytics
from .services import faq_service

def handle_message(sender_id: str, user_message: str):
    """
    Orchestrate the AI message flow.
    """
    # 1. Check FAQ Database first
    faq_answer = faq_service.search_faq(user_message)
    if faq_answer:
        # If match, return immediately and log it
        analytics.log_interaction(sender_id, user_message, faq_answer, 1.0, False)
        return faq_answer

    # 2. No history (Redis removed)
    formatted_history = []

    # 2. RAG retrieve from Supabase
    context_str, confidence_score = rag_pipeline.retrieve_context(user_message)
    
    # 3. Check context confidence for handoff
    handoff_triggered = False
    if confidence_score < 0.4 and context_str == "":
        handoff.trigger_handoff(sender_id, user_message, confidence_score)
        handoff_triggered = True
        
    # 4. Call Gemini if confident
    ai_reply = ChatGoogleGenerativeAI.generate_response(user_message, context_str, formatted_history)
    
    # 5. Log analytics
    analytics.log_interaction(sender_id, user_message, ai_reply, confidence_score, handoff_triggered)
    
    # 6. (Memory saving removed)
    
    # 7. Return/Send response to Messenger
    return ai_reply
