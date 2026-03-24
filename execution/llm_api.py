"""
Private LLM API (FastAPI)
Acts as a wrapper around Hugging Face Inference API.
Can be updated in the future to host models directly.
"""

import os
import requests
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from dotenv import load_dotenv
from huggingface_hub import InferenceClient

load_dotenv()

app = FastAPI(title="Private LLM API")

# Hugging Face config
HF_API_KEY = os.getenv("HUGGINGFACE_API_KEY")
HF_MODEL_ID = os.getenv("HUGGINGFACE_MODEL_ID", "mistralai/Mistral-7B-Instruct-v0.2")
HF_API_URL = os.getenv("PRIVATE_API_URL", "http://localhost:8020/generate") # Added HF_API_URL

class Message(BaseModel):
    role: str
    content: str

class GenerateRequest(BaseModel):
    user_message: str
    context: Optional[str] = ""
    history: Optional[List[dict]] = []

@app.get("/")
def read_root():
    return {"status": "online", "model": HF_MODEL_ID}

@app.post("/generate")
async def generate(request: GenerateRequest):
    """
    Generate response using legacy requests approach.
    """
    if not HF_API_KEY:
        raise HTTPException(status_code=500, detail="HF_API_KEY is not set")

    api_url = f"https://api-inference.huggingface.co/models/{HF_MODEL_ID}"
    headers = {
        "Authorization": f"Bearer {HF_API_KEY}",
        "Content-Type": "application/json"
    }

    # Construct prompt (using ChatML format which Qwen uses)
    prompt = "<|im_start|>system\nBạn là một trợ lý AI thông minh và hữu ích cho chatbot Facebook. Sử dụng ngữ cảnh được cung cấp để trả lời các câu hỏi của người dùng một cách chính xác.<|im_end|>\n"
    
    if request.context:
        prompt += f"<|im_start|>system\nNgữ cảnh nền:\n{request.context}<|im_end|>\n"
        
    for msg in request.history[-5:]:
        role = "assistant" if msg.get("role") == "model" or msg.get("role") == "ms" else "user"
        prompt += f"<|im_start|>{role}\n{msg.get('content')}<|im_end|>\n"
        
    prompt += f"<|im_start|>user\n{request.user_message}<|im_end|>\n<|im_start|>assistant\n"

    payload = {
        "inputs": prompt,
        "parameters": {"max_new_tokens": 512, "temperature": 0.7}
    }

    try:
        response = requests.post(api_url, headers=headers, json=payload, timeout=60)
        
        if response.status_code == 503:
            return {"response": "Máy chủ AI đang khởi động. Vui lòng thử lại sau vài giây."}
            
        response.raise_for_status()
        result = response.json()
        
        if isinstance(result, list) and len(result) > 0:
            gen_text = result[0].get("generated_text", "")
            # Extract only the assistant's response
            if "<|im_start|>assistant\n" in gen_text:
                gen_text = gen_text.split("<|im_start|>assistant\n")[-1].split("<|im_end|>")[0].strip()
            elif gen_text.startswith(prompt):
                gen_text = gen_text[len(prompt):].strip()
            return {"response": gen_text}
            
        return {"response": str(result)}
            
    except Exception as e:
        import traceback
        error_info = f"Error in Proxy: {e}\n{traceback.format_exc()}"
        with open("api_debug.log", "a", encoding="utf-8") as f:
            f.write(error_info + "\n")
        print(error_info)
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8020)
