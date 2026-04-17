"""
Gemini Integration -> Migrated to OpenRouter Integration

Responsibilities:
- Generate responses using OpenRouter models and provided context/history.
- Enforce Structured Outputs (JSON/Pydantic) for downstream processing.
"""
from openai import OpenAI
import os
import threading
from google import genai
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def generate_response(user_message: str, context: str, history: list, api_key: str = None) -> str:
    """
    Call Gemini API with grounded context.
    
    Args:
        user_message: The latest message from the user
        context: Context retrieved from vector database
        history: Array of prior conversation messages (dicts with 'role' and 'content')
        api_key: The Gemini API key to use (optional, falls back to env)
    """
    system_prompt = (
        "You are a friendly, polite, and professional student advisor/consultant at USTH "
        "(University of Science and Technology of Hanoi), acting as a page admin answering messages on Facebook Messenger. "
        "You chat like a real person: natural, approachable, concise, but always respectful. "
        "Follow these STRICT guidelines:\n"
        "1. TONE: Use the pronoun 'mình' for yourself and 'bạn' for the user. "
        "Be polite but not robotic. Add soft Vietnamese particles like 'ạ', 'nhé', or 'nha' naturally. "
        "AVOID cliché AI openings/closings like 'Chào bạn!', 'Rất vui được hỗ trợ'.\n"
        "2. CONCISENESS: Keep answers extremely short. NEVER write long paragraphs. "
        "Summarize lists into broad categories and ask a polite follow-up question.\n"
        "3. MESSAGE SPLITTING: Break your response into 2 to 4 short, separate thoughts. "
        "You MUST use the exact string '[SPLIT]' to separate each bubble. "
        "Example format: 'Dạ trường có nhiều ngành lắm ạ [SPLIT] Phổ biến nhất là mảng ICT và Hàng không [SPLIT] Bạn đang quan tâm nhóm ngành nào ạ?'\n"
        "4. ACCURACY & HANDOFF: Base your answers ONLY on the provided Background Context. "
        "If you don't know the answer, politely say you will check. "
        "Set 'needs_human' to true if the question is unanswerable from the context or the user needs complex support. "
        "Evaluate your 'confidence_score' based on how well the context covers the question.\n\n"
        "You MUST output your response strictly as a JSON object with the following fields:\n"
        '- "answer" (string)\n'
        '- "confidence_score" (float)\n'
        '- "needs_human" (boolean)\n'
    )
    
    full_prompt = ""
    
    if context:
        full_prompt += f"Background Context:\n{context}\n\n"
        
    if history:
        full_prompt += "Conversation Chat History:\n"
        for msg in history[-10:]:
            role = "User" if msg.get("role") == "user" else "Assistant"
            full_prompt += f"{role}: {msg.get('content')}\n"
            
    full_prompt += f"\nUser: {user_message}"
    
    # Initialize client with provided key or fallback to env
    gemini_key = api_key or os.getenv("GEMINI_API_KEY")
    if not gemini_key:
        return "I'm having trouble connecting to my brain (Gemini API key missing). Please check settings."

    try:
        client = genai.Client(api_key=gemini_key)
        # Using a stable model name
        response = client.models.generate_content(
            model='gemini-1.5-flash',
            contents=full_prompt,
        )
        
        content = response.choices[0].message.content
        # Clean potential markdown wrapping
        clean_content = re.sub(r"```json\s*", "", content)
        clean_content = re.sub(r"\s*```", "", clean_content).strip()
        
        data = json.loads(clean_content)
        # Bắt buộc các keys, fallback nếu model làm sai
        return BotResponse(
            answer=data.get("answer", "Dạ mình chưa hiểu ý bạn lắm ạ."),
            confidence_score=float(data.get("confidence_score", 0.0)),
            needs_human=bool(data.get("needs_human", True))
        )
        
    except Exception as e:
        print(f"Error calling LLM API: {e}")
        return BotResponse(
            answer="Dạ hiện tại đường truyền đang hơi chậm [SPLIT] Bạn nhắn lại giúp mình sau ít phút nhé ạ.",
            confidence_score=0.0,
            needs_human=True
        )
