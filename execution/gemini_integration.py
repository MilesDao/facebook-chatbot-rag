"""
Gemini Integration

Responsibilities:
- Generate responses using Gemini and provided context/history.
"""

import os
import google.generativeai as genai

# Configure Gemini
api_key = os.getenv("GEMINI_API_KEY")
if api_key:
    genai.configure(api_key=api_key)

# Initialize the specific model version requested
model = genai.GenerativeModel("gemini-2.5-flash")

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
    
    try:
        response = model.generate_content(full_prompt)
        return response.text
    except Exception as e:
        print(f"Error calling Gemini: {e}")
        return "I'm having trouble connecting to my brain right now. Please try again later."
