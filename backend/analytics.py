from .database import supabase

def log_interaction(sender_id, user_message, ai_reply, confidence_score, handoff_triggered, workspace_id=None):
    """
    Log to database for performance monitoring.
    """
    if not supabase:
        print("Warning: Supabase not initialized, skipping log.")
        return

    try:
        data = {
            "sender_id": sender_id,
            "user_message": user_message,
            "ai_reply": ai_reply,
            "confidence_score": confidence_score,
            "handoff_triggered": handoff_triggered,
            "workspace_id": workspace_id
        }
        supabase.table("logs").insert(data).execute()
        print(f"Logged interaction for {sender_id}")
    except Exception as e:
        print(f"Error logging interaction: {e}")
