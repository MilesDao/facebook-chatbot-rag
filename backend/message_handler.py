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

# Graceful fallback if analytics/handoff modules are not fully implemented yet
try:
    from . import handoff
except ImportError:
    handoff = None

try:
    from . import analytics
except ImportError:
    analytics = None

# ĐÃ XÓA user_sessions (Vì giờ hệ thống dùng Redis để quản lý session chuyên nghiệp hơn)

def handle_message(sender_id: str, user_message: str) -> str:
    """
    Orchestrate the AI message flow.
    """
    print(f"\n[📩 Processing] User {sender_id}: {user_message}")

    # 1. Initialize History (Kéo lịch sử từ Redis lên, lấy 6 tin nhắn gần nhất)
    history = get_history(sender_id, limit=6)

    # 2. Route Intent (Chitchat vs QA)
    intent = classify_intent(user_message)
    print(f"  [🏷️  Intent]: {intent}")

    # 3. Retrieve Context from Supabase ONLY if Intent is QA
    context_str = ""
    if intent == "QA":
        context_str, db_score = retrieve_context(user_message)

    # 4. Generate AI Response (Returns Pydantic Object)
    reply_obj = generate_response(user_message, context_str, history)
    
    # Bóc tách dữ liệu từ Object / Extract data from Structured Output
    final_answer = reply_obj.answer
    confidence = reply_obj.confidence_score
    needs_human = reply_obj.needs_human

    # 5. Trigger Handoff (Rely strictly on the LLM's self-evaluation)
    if needs_human and handoff:
        try:
            print("  [⚠️ Handoff Triggered by LLM]")
            handoff.trigger_handoff(sender_id, user_message, confidence)
        except Exception as e:
            print(f"  [❌ Handoff Error]: {e}")

    # 6. Log Analytics
    if analytics:
        try:
            analytics.log_interaction(sender_id, user_message, final_answer, confidence, needs_human)
        except Exception as e:
            print(f"  [❌ Analytics Error]: {e}")

    # 7. Update Memory (Lưu vào Redis)
    # Lưu tin nhắn của khách
    add_message(sender_id, role="user", content=user_message)
    # Lưu câu trả lời của AI
    add_message(sender_id, role="assistant", content=final_answer)

    # 8. Return strictly the text string for Messenger API
    # Nhớ chuỗi này vẫn đang chứa các ký tự [SPLIT] để main.py xử lý nhả chữ từ từ
    return final_answer