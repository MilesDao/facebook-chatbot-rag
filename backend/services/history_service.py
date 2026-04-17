import os
from ..database import supabase

def add_message(sender_id: str, role: str, content: str):
    """
    Save a new message to Supabase chat_history table.
    Replaces Redis rpush and ltrim logic.
    """
    if not supabase:
        print("Warning: Supabase not initialized, skipping history logging.")
        return

    try:
        # Construct the data object
        data = {
            "sender_id": sender_id,
            "role": role,
            "content": content
        }
        
        # Insert into chat_history table
        supabase.table("chat_history").insert(data).execute()
        
    except Exception as e:
        print(f"Error saving history to Supabase: {e}")

def get_history(sender_id: str, limit: int = 10) -> list:
    """
    Retrieve the last N messages for a specific user to provide context for OpenRouter.
    Replaces Redis lrange logic.
    """
    if not supabase:
        print("Warning: Supabase not initialized, returning empty history.")
        return []

    try:
        # Fetch records ordered by time (newest first)
        response = supabase.table("chat_history") \
            .select("role", "content") \
            .eq("sender_id", sender_id) \
            .order("created_at", desc=True) \
            .limit(limit) \
            .execute()
        
        # Reverse the list to maintain chronological order [oldest -> newest] for the LLM
        history = response.data[::-1]
        return history
        
    except Exception as e:
        print(f"Error fetching history from Supabase: {e}")
        return []

def clear_history(sender_id: str):
    """
    Delete all chat history for a specific user.
    Replaces Redis delete logic.
    """
    if not supabase:
        return

    try:
        supabase.table("chat_history").delete().eq("sender_id", sender_id).execute()
    except Exception as e:
        print(f"Error clearing history from Supabase: {e}")