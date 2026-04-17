from .database import supabase

def trigger_handoff(sender_id: str, user_message: str, score: float, user_id=None):
    """
    Escalate the interaction based on low RAG score.
    """
    if not supabase:
        print("Warning: Supabase not initialized, skipping handoff trigger.")
        return

    try:
        data = {
            "sender_id": sender_id,
            "user_message": user_message,
            "confidence_score": score,
            "status": "active",
            "user_id": user_id
        }
        supabase.table("handoffs").insert(data).execute()
        print(f"Handoff triggered for {sender_id} (Score: {score})")
    except Exception as e:
        print(f"Error triggering handoff: {e}")