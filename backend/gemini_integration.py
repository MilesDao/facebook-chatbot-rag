"""
Gemini Integration

Responsibilities:
- Generate responses using Gemini and provided context/history.
"""

import os
import threading
from google import genai
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# ---------------------------------------------------------------------------
# FIX: Thread-safe Gemini client singleton (mirrors rag_pipeline.py fix)
# Previously `client` was a module-level global re-assigned via `global client`
# inside generate_response() — concurrent FastAPI requests race-conditioned it.
# ---------------------------------------------------------------------------
_client_lock = threading.Lock()
_gemini_client: genai.Client | None = None


def _get_client() -> genai.Client | None:
    """Return the singleton Gemini client, initializing it once under a lock."""
    global _gemini_client
    if _gemini_client is not None:
        return _gemini_client
    with _client_lock:
        if _gemini_client is None:
            key = os.getenv("GEMINI_API_KEY")
            if not key:
                print("CRITICAL: GEMINI_API_KEY is missing from environment variables!")
                return None
            try:
                _gemini_client = genai.Client(api_key=key)
            except Exception as e:
                print(f"Error initializing Gemini Client: {e}")
                return None
    return _gemini_client


def generate_response(user_message: str, context: str, history: list) -> str:
    """
    Call Gemini API with grounded context.
    
    Args:
        user_message: The latest message from the user
        context: Context retrieved from vector database
        history: Array of prior conversation messages (dicts with 'role' and 'content')
    """
    system_prompt = (
        "You are an intelligent, helpful AI Messenger Bot. "
        "Use the provided context to answer the user's questions accurately. "
        "If you don't know the answer based on the context, politely let the user know, "
        "and do not make up undocumented information."
    )
    
    # We construct the prompt combining the system message, context, history, and query
    full_prompt = f"System: {system_prompt}\n\n"
    
    if context:
        full_prompt += f"Background Context:\n{context}\n\n"
        
    if history:
        full_prompt += "Conversation Chat History:\n"
        # Include a limited window of recent history
        for msg in history[-10:]:
            role = "User" if msg.get("role") == "user" else "Assistant"
            full_prompt += f"{role}: {msg.get('content')}\n"
            
    full_prompt += f"\nUser: {user_message}\nAssistant:"
    
    client = _get_client()
    if not client:
        return "I'm having trouble connecting to my brain (Gemini API key missing). Please check settings."

    try:
        # Using a stable model name
        response = client.models.generate_content(
            model='gemini-1.5-flash',
            contents=full_prompt,
        )
        return response.text
    except Exception as e:
        print(f"Error calling Gemini: {e}")
        return "I'm having trouble connecting to my brain right now. Please try again later."

