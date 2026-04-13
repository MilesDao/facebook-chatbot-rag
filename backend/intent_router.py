import os
from google import genai
from pydantic import BaseModel, Field

# Khởi tạo client theo chuẩn SDK mới của Google
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

# Định nghĩa cấu trúc dữ liệu ép Gemini phải tuân theo
class IntentResponse(BaseModel):
    intent: str = Field(description="Must be strictly 'CHITCHAT' or 'QA'")

def classify_intent(user_query: str) -> str:
    """
    Classifies user query into CHITCHAT or QA.
    """
    system_instruction = """
    You are a high-speed traffic router for an AI assistant.
    Analyze the user's message and classify its core intent.
    - Return 'CHITCHAT' if it is a greeting, casual talk, expressing emotions, or a simple acknowledgement (e.g., "hi", "cảm ơn", "alo", "ok", "dạ").
    - Return 'QA' if it is a question or request requiring specific knowledge, facts, business data, or task execution (e.g., "giá bao nhiêu?", "địa chỉ ở đâu?", "hướng dẫn tôi...").
    """
    
    try:
        response = client.models.generate_content(
            model='gemini-2.5-flash', 
            contents=user_query,
            config=genai.types.GenerateContentConfig(
                system_instruction=system_instruction,
                response_mime_type="application/json",
                response_schema=IntentResponse,
                temperature=0.0 # QUAN TRỌNG: Nhiệt độ = 0 để model không sáng tạo, chỉ làm đúng nhiệm vụ phân loại.
            )
        )
        return response.parsed.intent
    except Exception as e:
        print(f"Router Error: {e}")
        # Best Practice: Nếu lỗi API, mặc định đẩy vào RAG (QA) để đảm bảo không rớt câu hỏi của khách
        return "QA"