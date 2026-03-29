import os
from groq import Groq
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_MODEL_ID = os.getenv("GROQ_MODEL_ID", "llama-3.3-70b-versatile")

# Initialize Groq Client
client = Groq(api_key=GROQ_API_KEY) if GROQ_API_KEY else None

def generate_response(user_message: str, context: str, history: list) -> str:
    """
    Generate response using Groq API (Llama 3.3 70B).
    """
    if not client:
        print("Error: GROQ_API_KEY is not set")
        return "Tôi đang gặp vấn đề về cấu hình kỹ thuật (Groq). Vui lòng thử lại sau."

    # Construct messages array for chat completion
    system_content = (
        "Bạn là một trợ lý AI thông minh, nhiệt tình cho chatbot Facebook. "
        "Sử dụng ngữ cảnh được cung cấp để trả lời các câu hỏi của người dùng một cách ngắn gọn, chính xác bằng tiếng Việt. "
        "Nếu không có trong ngữ cảnh, hãy trả lời dựa trên kiến thức của bạn nhưng vẫn giữ phong cách hỗ trợ."
    )
    if context:
        system_content += f"\n\nNgữ cảnh nền:\n{context}"
        
    messages = [
        {"role": "system", "content": system_content}
    ]
    
    # Add history (limit to last 10 messages)
    for msg in history[-10:]:
        role = msg.get("role", "user")
        content = msg.get("content", "")
        # Groq expects 'assistant' instead of 'model'
        messages.append({"role": "assistant" if role == "model" else role, "content": content})
        
    messages.append({"role": "user", "content": user_message})

    try:
        completion = client.chat.completions.create(
            model=GROQ_MODEL_ID,
            messages=messages,
            max_completion_tokens=1024,
            temperature=0.7,
            top_p=1,
            stream=False,
        )
        
        return completion.choices[0].message.content.strip()
            
    except Exception as e:
        print(f"Error calling Groq API: {e}")
        return "Tôi đang gặp vấn đề khi kết nối với máy chủ AI (Groq). Vui lòng thử lại sau."
