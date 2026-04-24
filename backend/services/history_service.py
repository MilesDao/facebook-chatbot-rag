import os
from ..database import supabase

def add_message(sender_id: str, role: str, content: str, workspace_id: str = None):
    """
    Save a new message to Supabase chat_history table.
    """
    if not supabase:
        print("Warning: Supabase not initialized, skipping history logging.")
        return

    try:
        data = {
            "sender_id": sender_id,
            "role": role,
            "content": content
        }
        if workspace_id:
            data["workspace_id"] = workspace_id
        
        supabase.table("chat_history").insert(data).execute()
        
    except Exception as e:
        print(f"Error saving history to Supabase: {e}")

def get_history(sender_id: str, limit: int = 10, workspace_id: str = None) -> list:
    """
    Retrieve the last N messages for a specific sender to provide context for OpenRouter.
    """
    if not supabase:
        print("Warning: Supabase not initialized, returning empty history.")
        return []

    try:
        query = supabase.table("chat_history") \
            .select("role", "content") \
            .eq("sender_id", sender_id)
        
        if workspace_id:
            query = query.eq("workspace_id", workspace_id)
        
        response = query.order("created_at", desc=True) \
            .limit(limit) \
            .execute()
        
        # Reverse the list to maintain chronological order [oldest -> newest] for the LLM
        history = response.data[::-1]
        return history
        
    except Exception as e:
        print(f"Error fetching history from Supabase: {e}")
        return []

def clear_history(sender_id: str, workspace_id: str = None):
    """
    Delete all chat history for a specific sender.
    """
    if not supabase:
        return

    try:
        query = supabase.table("chat_history").delete().eq("sender_id", sender_id)
        if workspace_id:
            query = query.eq("workspace_id", workspace_id)
        query.execute()
    except Exception as e:
        print(f"Error clearing history from Supabase: {e}")