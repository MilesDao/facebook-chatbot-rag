import traceback
from .database import supabase

def log_interaction(sender_id, user_message, ai_reply, confidence_score, handoff_triggered, workspace_id=None):
    """
    Log to database for performance monitoring.
    """
    if not supabase:
        print("Warning: Supabase not initialized, skipping log.")
        return

    if not workspace_id:
        print(f"WARNING: log_interaction called with workspace_id={workspace_id} for sender {sender_id}. Analytics may not show in dashboard.")

    try:
        data = {
            "sender_id": sender_id,
            "user_message": user_message,
            "ai_reply": ai_reply,
            "confidence_score": confidence_score,
            "handoff_triggered": handoff_triggered,
            "workspace_id": workspace_id
        }
        result = supabase.table("logs").insert(data).execute()
        if result.data:
            print(f"Logged interaction for {sender_id} (workspace: {workspace_id})")
        else:
            print(f"WARNING: log insert returned no data for {sender_id}. Result: {result}")
    except Exception as e:
        print(f"ERROR logging interaction for {sender_id} (workspace: {workspace_id}): {e}")
        traceback.print_exc()
