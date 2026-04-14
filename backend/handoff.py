import os
import requests
from .database import supabase

# =====================================================================
# NEW FEATURE: EXTERNAL WEBHOOK ALERT
# Webhook URL for Slack/Discord/Telegram (Can be set in .env)
# =====================================================================
ALERT_WEBHOOK_URL = os.getenv("ALERT_WEBHOOK_URL", "")

def send_webhook_alert(sender_id: str, user_message: str, score: float):
    """
    Send a real-time notification to an external system (Slack/Discord/etc.)
    """
    if not ALERT_WEBHOOK_URL:
        return # Skip if no webhook URL is configured
        
    try:
        # Example payload format for standard webhooks (like Slack/Discord)
        payload = {
            "content": f"🚨 **AI CHATBOT HANDOFF ALERT** 🚨\n"
                       f"**User ID:** {sender_id}\n"
                       f"**Confidence Score:** {score}\n"
                       f"**Last Message:** '{user_message}'\n"
                       f"👉 *Please check the Admin Dashboard to take over!*"
        }
        requests.post(ALERT_WEBHOOK_URL, json=payload, timeout=5)
        print(f"  [🔔 Alert]: Webhook notification sent for {sender_id}")
    except Exception as e:
        print(f"  [❌ Alert Error]: Failed to send webhook: {e}")

# =====================================================================


def trigger_handoff(sender_id: str, user_message: str, score: float):
    """
    Escalate the interaction based on low RAG score or explicit request.
    """
    if not supabase:
        print("Warning: Supabase not initialized, skipping handoff trigger.")
        return

    try:
        data = {
            "sender_id": sender_id,
            "user_message": user_message,
            "confidence_score": score,
            "status": "active" 
        }
        
        supabase.table("handoffs").insert(data).execute()
        print(f"Handoff triggered for {sender_id} (Score: {score})")
        
        send_webhook_alert(sender_id, user_message, score)
        
    except Exception as e:
        print(f"Error triggering handoff: {e}")