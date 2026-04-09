import urllib.request
import json

# Dán API Key thật của bạn vào đây
api_key = "AIzaSyDSPUd-Gf-_qnWLFgFz49vrmqFBroCLLBc"

url = f"https://generativelanguage.googleapis.com/v1beta/models?key={api_key}"

print("Đang kết nối với Google để lấy danh sách...")
try:
    with urllib.request.urlopen(url) as response:
        data = json.loads(response.read().decode())
        print("\n=== CÁC MODEL BẠN ĐƯỢC PHÉP DÙNG ===")
        for m in data.get('models', []):
            # Chỉ lọc ra các model hỗ trợ chat/tạo văn bản
            if 'generateContent' in m.get('supportedGenerationMethods', []):
                tên_mã = m['name'].replace('models/', '')
                print(f"- {tên_mã}")
except Exception as e:
    print("Lỗi kết nối:", e)