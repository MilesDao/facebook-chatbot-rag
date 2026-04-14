"""
Gemini Integration

Responsibilities:
- Generate responses using Gemini and provided context/history.
- Enforce Structured Outputs (JSON/Pydantic) for downstream processing.
"""
import os
import time
from google import genai
from google.genai import types
from pydantic import BaseModel, Field
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

print(f"DEBUG: Using API Key: {os.getenv('GEMINI_API_KEY')[:10] if os.getenv('GEMINI_API_KEY') else 'None'}...")

# --- 1. ĐỊNH NGHĨA KHUÔN DỮ LIỆU ĐẦU RA (STRUCTURED OUTPUT SCHEMA) ---
class BotResponse(BaseModel):
    answer: str = Field(
        description="Câu trả lời gửi cho khách hàng, tuân thủ nghiêm ngặt việc chia nhỏ bằng ký tự [SPLIT]."
    )
    confidence_score: float = Field(
        description="Điểm tự tin của câu trả lời từ 0.0 đến 1.0 (1.0 là cực kỳ chắc chắn vì có dữ liệu trong Context)."
    )
    needs_human: bool = Field(
        description="Trả về True nếu user đang cáu gắt, hoặc hỏi những câu quá phức tạp mà Context không có, cần chuyển cho tư vấn viên là người thật."
    )

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


def generate_response(user_message: str, context: str, history: list) -> BotResponse:
    """
    Call Gemini API with grounded context and return a Structured Output object.
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
        "Evaluate your 'confidence_score' based on how well the context covers the question."
    )
    
    full_prompt = f"System: {system_prompt}\n\n"
    
    if context:
        full_prompt += f"Background Context:\n{context}\n\n"
        
    if history:
        full_prompt += "Conversation Chat History:\n"
        for msg in history[-10:]:
            role = "User" if msg.get("role") == "user" else "Assistant"
            full_prompt += f"{role}: {msg.get('content')}\n"
            
    full_prompt += f"\nUser: {user_message}\nAssistant:"
    
    global client
    if not client:
        client = get_gemini_client()
        
    if not client:
        # Fallback object if API fails
        return BotResponse(
            answer="Dạ hệ thống bên mình đang bảo trì một chút [SPLIT] Bạn vui lòng chờ trong giây lát nhé ạ.",
            confidence_score=0.0,
            needs_human=True
        )

    max_retries = 6
    base_delay = 1.5

    for attempt in range(max_retries):
        try:
            # --- 2. ÉP GEMINI TRẢ VỀ THEO SCHEMA ---
            response = client.models.generate_content(
                model='gemini-2.5-flash',
                contents=full_prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=BotResponse,
                    temperature=0.7 # Tạo độ tự nhiên vừa phải
                )
            )
            
            # Trả về Object đã được parse sẵn
            return response.parsed
            
        except Exception as e:
            print(f"Error calling Gemini (Attempt {attempt + 1}/{max_retries}): {e}")
            if attempt < max_retries - 1:
                # Exponential backoff
                time.sleep(base_delay * (2 ** attempt))
            else:
                return BotResponse(
                    answer="Dạ hiện tại đường truyền đang hơi chậm [SPLIT] Bạn nhắn lại giúp mình sau ít phút nhé ạ.",
                    confidence_score=0.0,
                    needs_human=True
                )
