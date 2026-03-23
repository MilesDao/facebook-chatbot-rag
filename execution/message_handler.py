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

from execution import memory
from execution import rag_pipeline
from execution import gemini_integration
from execution import handoff
from execution import analytics

def handle_message(sender_id: str, user_message: str):
    """
    Orchestrate the AI message flow.
    """
    # 1. Load history from Redis
    raw_history = memory.get_history(sender_id)
    formatted_history = []
    for turn in raw_history:
        formatted_history.append({"role": "user", "content": turn.get("user", "")})
        formatted_history.append({"role": "model", "content": turn.get("bot", "")})

    # 2. RAG retrieve from Supabase
    context_str, confidence_score = rag_pipeline.retrieve_context(user_message)
    
    # 3. Check context confidence for handoff
    handoff_triggered = False
    if confidence_score < 0.4 and context_str == "":
        handoff.trigger_handoff(sender_id, user_message, confidence_score)
        handoff_triggered = True
        
    # 4. Call Gemini LLM if confident (Proceeding to generate regardless of confidence here as a fallback)
    ai_reply = gemini_integration.generate_response(user_message, context_str, formatted_history)
    
    # 5. Log analytics
    analytics.log_interaction(sender_id, user_message, ai_reply, confidence_score, handoff_triggered)
    
    # 6. Save new history to Redis
    memory.append_message(sender_id, user_message, ai_reply)
    
    # 7. Return/Send response to Messenger
    return ai_reply
