# Tên file: app.py
from flask import Flask, request, jsonify
import requests
from pdf_handler import process_and_upload_pdf 

app = Flask(__name__)

# Token của page Facebook mày (Lấy trong Meta for Developers)
PAGE_ACCESS_TOKEN = "ĐIỀN_TOKEN_CỦA_MÀY_VÀO_ĐÂY"

def send_message(sender_id, text):
    """Hàm phụ trợ để bot chat lại với học sinh"""
    url = f"https://graph.facebook.com/v18.0/me/messages?access_token={PAGE_ACCESS_TOKEN}"
    payload = {
        "recipient": {"id": sender_id},
        "message": {"text": text}
    }
    requests.post(url, json=payload)

# --- ĐÂY LÀ BƯỚC 1: HỨNG WEBHOOK ---
@app.route('/webhook', methods=['POST'])
def webhook_receive():
    data = request.get_json() # Bắt cục data JSON từ Facebook ném sang

    if data['object'] == 'page':
        for entry in data['entry']:
            for messaging_event in entry['messaging']:
                
                # Lấy ID của học sinh để tí bot biết chat lại với ai
                sender_id = messaging_event['sender']['id']
                
                # Kiểm tra xem tin nhắn có chứa file đính kèm không
                if 'message' in messaging_event and 'attachments' in messaging_event['message']:
                    attachments = messaging_event['message']['attachments']
                    
                    # Tạo 1 cái list trống để chứa link ảnh
                    image_urls = []
                    
                    # Bóc tách từng cái link ảnh ra (Giải quyết BƯỚC 1)
                    for attachment in attachments:
                        if attachment['type'] == 'image':
                            # Lấy URL của ảnh và nhét vào list
                            image_urls.append(attachment['payload']['url'])
                    
                    # --- ĐÂY LÀ BƯỚC 3: TÍCH HỢP QUY TRÌNH ---
                    if len(image_urls) > 0:
                        # 3.1 Báo cho học sinh biết bot đang làm việc
                        send_message(sender_id, "⏳ Bot đang nhận ảnh và tạo file PDF, đợi tao vài giây nhé...")
                        
                        # 3.2 Gọi cái hàm thần thánh ở Bước 2 ra xử lý
                        # Nhét list link ảnh và ID học sinh vào
                        pdf_link = process_and_upload_pdf(image_urls, sender_id)
                        
                        # 3.3 Trả kết quả
                        if pdf_link:
                            send_message(sender_id, "✅ Xong! Hồ sơ của mày đã được gửi thẳng tới phòng tuyển sinh.")
                            # Gửi kèm link cho học sinh yên tâm (tùy chọn)
                            send_message(sender_id, f"Bản mềm của mày đây, kiểm tra lại nhé: {pdf_link}")
                        else:
                            send_message(sender_id, "❌ Lỗi hệ thống khi gộp ảnh rồi fen ơi, gửi lại giúp bot nhé!")
                
                # Nếu họ gửi chữ bình thường (chứ ko gửi ảnh)
                elif 'message' in messaging_event and 'text' in messaging_event['message']:
                    text = messaging_event['message']['text']
                    send_message(sender_id, f"Mày vừa chat nội dung: {text}. Nếu muốn nộp hồ sơ, hãy gửi ảnh cho bot nhé!")

    return "EVENT_RECEIVED", 200 # Bắt buộc phải trả về 200 OK cho Facebook

if __name__ == '__main__':
    app.run(port=5000, debug=True)