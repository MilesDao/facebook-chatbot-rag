import os
import requests
from dotenv import load_dotenv
from huggingface_hub import InferenceClient

load_dotenv()

def test_embeddings():
    print("\n--- Testing Embeddings ---")
    HF_API_KEY = os.getenv("HUGGINGFACE_API_KEY")
    model_id = "intfloat/multilingual-e5-base"
    api_url = f"https://api-inference.huggingface.co/models/{model_id}"
    headers = {"Authorization": f"Bearer {HF_API_KEY}", "X-Wait-For-Model": "true"}
    
    text = "Hello world"
    payload = {"inputs": f"query: {text}"}
    
    try:
        response = requests.post(api_url, headers=headers, json=payload, timeout=30)
        response.raise_for_status()
        result = response.json()
        print(f"Success! Embedding size: {len(result[0]) if isinstance(result, list) and isinstance(result[0], list) else len(result)}")
    except Exception as e:
        print(f"Embedding Test Failed: {e}")

def test_chat():
    print("\n--- Testing Chat Generation ---")
    HF_API_KEY = os.getenv("HUGGINGFACE_API_KEY")
    HF_MODEL_ID = os.getenv("HUGGINGFACE_MODEL_ID", "Qwen/Qwen2.5-7B-Instruct")
    
    client = InferenceClient(api_key=HF_API_KEY)
    
    messages = [
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": "Say 'Hugging Face is working!'"}
    ]
    
    try:
        response = client.chat_completion(
            model=HF_MODEL_ID,
            messages=messages,
            max_tokens=50
        )
        print(f"Success! Response: {response.choices[0].message.content.strip()}")
    except Exception as e:
        print(f"Chat Test Failed: {e}")

if __name__ == "__main__":
    test_embeddings()
    test_chat()
