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
from .database import supabase

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
    # =====================================================================
    # NEW FEATURE:CHECK MANUAL INTERRUPT STATUS
    # Check if a human has taken over. If yes, the bot must stay silent.
    # =====================================================================
    if supabase:
        try:
            session_res = supabase.table("user_sessions").select("status").eq("sender_id", sender_id).execute()
            # If status is 'human_takeover', return empty string. 
            # In main.py, an empty string won't trigger any Messenger sends.
            if session_res.data and session_res.data[0].get("status") == "human_takeover":
                print(f"  [🔒 Blocked]: Session for {sender_id} is currently managed by a human.")
                return ""
        except Exception as e:
            print(f"  [❌ DB Error checking session status]: {e}")
    # =====================================================================
    # 1. Check FAQ Database first
    faq_answer = faq_service.search_faq(user_message)
    if faq_answer:
        # If match, return immediately and log it
        analytics.log_interaction(sender_id, user_message, faq_answer, 1.0, False)
        return faq_answer

    # 2. No history (Redis removed)
    formatted_history = []

    # 1. Initialize History (Kéo lịch sử từ Redis lên, lấy 6 tin nhắn gần nhất)
    history = get_history(sender_id, limit=6)

    # 2. Route Intent (Chitchat vs QA)
    intent = classify_intent(user_message)
    print(f"  [🏷️  Intent]: {intent}")

    # 3. Retrieve Context from Supabase ONLY if Intent is QA
    context_str = ""
    if intent == "QA":
        context_str, db_score = retrieve_context(user_message)
        print(f"DEBUG RAG: Tìm thấy {len(context_str)} ký tự. Score: {db_score}") # Thêm dòng này để soi
    if len(context_str) > 0:
        print(f"CONTEXT NỘI DUNG: {context_str[:200]}...") # In thử 200 ký tự đầu

    # 4. Generate AI Response (Returns Pydantic Object)
    #reply_obj = generate_response(user_message, context_str, history)
    class MockReply:
        def __init__(self):
            self.answer = "Hệ thống đang quá tải, chuyển máy cho nhân viên ngay!"
            self.confidence_score = 0.1
            self.needs_human = True # <--- Ép nó bằng True để kích hoạt Handoff
            
    reply_obj = MockReply()
    # Bóc tách dữ liệu từ Object / Extract data from Structured Output
    final_answer = reply_obj.answer
    confidence = reply_obj.confidence_score
    needs_human = reply_obj.needs_human

    # 5. Trigger Handoff (Rely strictly on the LLM's self-evaluation)
    if needs_human and handoff:
        try:
            print("  [⚠️ Handoff Triggered by LLM]")
            handoff.trigger_handoff(sender_id, user_message, confidence)

            # =====================================================================
            # NEW FEATURE: AUTO-INTERRUPT (LOCK AI FOR NEXT MESSAGES)
            # If AI triggers handoff, automatically lock the session in database
            # so the bot doesn't answer subsequent messages until resumed.
            # =====================================================================
            if supabase:
                try:
                    supabase.table("user_sessions").upsert({
                        "sender_id": sender_id,
                        "status": "human_takeover"
                    }).execute()
                    print(f"  [🔒 Auto-Locked]: Changed status to human_takeover for {sender_id}")
                except Exception as db_err:
                    print(f"  [❌ DB Error updating session status]: {db_err}")
            # =====================================================================
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