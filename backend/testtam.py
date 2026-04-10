import requests

# Giả lập tin nhắn khách hàng gửi tới API của chị
url = "http://localhost:8000/generate"
payload = {
    "user_message": "Học phí ngành IT là bao nhiêu?",
    "context": "The tuition fee for Information Technology is 50 million VND per year.",
    "history": []
}

response = requests.post(url, json=payload)
print("Bot trả lời nè:", response.json())