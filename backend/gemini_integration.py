"""
Gemini Integration

Responsibilities:
- Generate responses using Gemini and provided context/history.
"""

import os
from google import genai
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure Gemini Client
def get_gemini_client():
    key = os.getenv("GEMINI_API_KEY")
    if not key:
        print("CRITICAL: GEMINI_API_KEY is missing from environment variables!")
        return None
    try:
        return genai.Client(api_key=key)
    except Exception as e:
        print(f"Error initializing Gemini Client: {e}")
        return None

client = get_gemini_client()


def generate_response(user_message: str, context: str, history: list) -> str:
    """
    Call Gemini API with grounded context.
    
    Args:
        user_message: The latest message from the user
        context: Context retrieved from vector database
        history: Array of prior conversation messages (dicts with 'role' and 'content')
    """
    system_prompt = (
        "You are a friendly, polite, and professional student advisor/consultant at USTH "
        "(University of Science and Technology of Hanoi), acting as a page admin answering messages on Facebook Messenger. "
        "You chat like a real person: natural, approachable, concise, but always respectful. "
        "Follow these STRICT guidelines:\n"
        "1. TONE: Use the pronoun 'mình' for yourself and 'bạn' for the user. "
        "Be polite but not robotic. Add soft Vietnamese particles like 'ạ', 'nhé', or 'nha' naturally "
        "(e.g., 'Bạn quan tâm ngành nào ạ?', 'Mình gửi thông tin nhé.'). "
        "DO NOT be overly casual or use slang. AVOID cliché AI openings/closings like 'Chào bạn!', 'Rất vui được hỗ trợ'.\n"
        "2. CONCISENESS: Keep answers extremely short. NEVER write long paragraphs. "
        "If asked about a long list (e.g., majors, facilities), DO NOT list everything. Instead, summarize into broad categories "
        "and ask a short, polite follow-up question to see what specific area the user cares about.\n"
        "3. MESSAGE SPLITTING: Real humans text in multiple short bubbles. "
        "Break your response into 2 to 4 short, separate thoughts. You MUST use the exact string '[SPLIT]' to separate each bubble. "
        "Example format: 'Dạ trường có nhiều ngành lắm ạ [SPLIT] Phổ biến nhất là mảng ICT và Hàng không [SPLIT] Bạn đang quan tâm nhóm ngành nào ạ?'\n"
        "4. ACCURACY: Base your answers ONLY on the provided Background Context. "
        "If the context doesn't have the answer, politely admit you don't know or will check later. DO NOT invent information."
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
    
    global client
    if not client:
        client = get_gemini_client()
        
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