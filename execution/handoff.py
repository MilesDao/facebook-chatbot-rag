"""
Human Handoff Mechanism

Responsibilities:
- Triggered on low retrieval confidence (e.g. < 0.4)
- Notify admin
- Escalate interaction
"""

def trigger_handoff(sender_id: str, user_message: str, score: float):
    """
    Escalate the interaction based on low RAG score.
    """
    pass
