import os
import json
import re
from openai import OpenAI
from pydantic import BaseModel, Field

# Khởi tạo client theo chuẩn OpenAI cho OpenRouter
client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=os.getenv("OPENROUTER_API_KEY")
)

# Định nghĩa cấu trúc dữ liệu ep LLM phải tuân theo
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
    
    You MUST output strictly as a JSON object with a single field 'intent' which must be either "CHITCHAT" or "QA".
    Example: {"intent": "QA"}
    """
    
    try:
        response = client.chat.completions.create(
            model='openai/gpt-oss-120b:free', 
            messages=[
                {"role": "system", "content": system_instruction},
                {"role": "user", "content": user_query}
            ],
            response_format={"type": "json_object"},
            temperature=0.0 # QUAN TRỌNG: Nhiệt độ = 0 để model không sáng tạo, chỉ làm đúng nhiệm vụ phân loại.
        )
        
        content = response.choices[0].message.content
        # Clean potential markdown wrapping
        clean_content = re.sub(r"```json\s*", "", content)
        clean_content = re.sub(r"\s*```", "", clean_content).strip()
        
        data = json.loads(clean_content)
        return data.get("intent", "QA").upper()
    except Exception as e:
        print(f"Router Error: {e}")
        # Best Practice: Nếu lỗi API, mặc định đẩy vào RAG (QA) để đảm bảo không rớt câu hỏi của khách
        return "QA"