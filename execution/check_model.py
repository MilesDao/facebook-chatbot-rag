import os
from huggingface_hub import model_info
from dotenv import load_dotenv

load_dotenv()

token = os.getenv("HUGGINGFACE_API_KEY")
model_id = "mistralai/Mistral-7B-Instruct-v0.2"

print(f"Checking model info for: {model_id}")
try:
    info = model_info(model_id, token=token)
    print(f"Model found! Authors: {info.author}, Last modified: {info.lastModified}")
    print(f"Pipeline tag: {info.pipeline_tag}")
    print(f"Tags: {info.tags}")
except Exception as e:
    print(f"Error: {e}")
