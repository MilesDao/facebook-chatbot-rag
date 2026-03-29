from huggingface_hub import InferenceClient

# Load environment variables
load_dotenv()

HF_API_KEY = os.getenv("HUGGINGFACE_API_KEY")
HF_MODEL_ID = os.getenv("HUGGINGFACE_MODEL_ID", "Qwen/Qwen2.5-7B-Instruct")

# Initialize Inference Client
client = InferenceClient(api_key=HF_API_KEY) if HF_API_KEY else None

def generate_response(user_message: str, context: str, history: list) -> str:
    """
    Generate response using Hugging Face Inference API (OpenAI-compatible).
    """
    if not client:
        print("Error: HUGGINGFACE_API_KEY is not set")
        return "Tôi đang gặp vấn đề về cấu hình kỹ thuật. Vui lòng thử lại sau."

    # Construct messages array for chat completion
    system_content = "Bạn là một trợ lý AI thông minh cho chatbot Facebook. Sử dụng ngữ cảnh được cung cấp để trả lời các câu hỏi của người dùng một cách ngắn gọn, chính xác."
    if context:
        system_content += f"\n\nNgữ cảnh nền:\n{context}"
        
    messages = [
        {"role": "system", "content": system_content}
    ]
    
    # Add history (limit to last 5 turns)
    for msg in history[-10:]:
        role = msg.get("role", "user")
        content = msg.get("content", "")
        # Map model role if needed
        messages.append({"role": role if role != "model" else "assistant", "content": content})
        
    messages.append({"role": "user", "content": user_message})

    try:
        # Use InferenceClient's chat_completion
        response = client.chat_completion(
            model=HF_MODEL_ID,
            messages=messages,
            max_tokens=512,
            temperature=0.7
        )
        
        return response.choices[0].message.content.strip()
            
    except Exception as e:
        print(f"Error calling HF Inference API: {e}")
        # Fallback if chat_completion fails or is not supported for this model
        return "Tôi đang gặp vấn đề khi kết nối với máy chủ AI. Vui lòng thử lại sau."
