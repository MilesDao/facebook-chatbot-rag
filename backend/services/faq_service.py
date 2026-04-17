import re
from ..database import supabase

def get_all_faqs(user_id=None):
    if not supabase:
        print("Warning: Supabase client not initialized")
        return []
    try:
        query = supabase.table("faqs").select("*")
        if user_id:
            query = query.eq("user_id", user_id)
        response = query.order("created_at", desc=True).execute()
        return response.data
    except Exception as e:
        print(f"Error fetching FAQs: {e}")
        return []

def create_faq(keyword: str, question: str, answer: str, user_id=None):
    if not supabase:
        raise Exception("Supabase client not initialized")
    try:
        data = {
            "keyword": keyword,
            "question": question,
            "answer": answer
        }
        if user_id:
            data["user_id"] = user_id
            
        response = supabase.table("faqs").insert(data).execute()
        return response.data
    except Exception as e:
        raise Exception(f"Error creating FAQ: {e}")

def delete_faq(faq_id: int):
    if not supabase:
        raise Exception("Supabase client not initialized")
    try:
        response = supabase.table("faqs").delete().eq("id", faq_id).execute()
        return response.data
    except Exception as e:
        raise Exception(f"Error deleting FAQ: {e}")

def search_faq(user_message: str, user_id=None):
    """
    Check if any FAQ keyword matches the user message (case-insensitive substring match).
    If multiple match, returns the first one.
    """
    faqs = get_all_faqs(user_id=user_id)
    user_msg_lower = user_message.lower()
    
    for faq in faqs:
        keyword = str(faq.get("keyword", "")).lower().strip()
        if keyword and keyword in user_msg_lower:
            return faq.get("answer")
            
    return None
