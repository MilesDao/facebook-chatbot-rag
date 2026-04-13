from dotenv import load_dotenv
load_dotenv()

# Import hàm lõi xử lý tin nhắn
from backend.message_handler import handle_message 
# Import hàm lấy lịch sử để check Redis
from backend.services.history_service import get_history 

def run_test():
    # Tạo một cái ID giả định cho m
    fake_sender_id = "test_user_2026"
    
    print("="*50)
    print("🤖 TERMINAL CHATBOT TESTER V1.0")
    print("Gõ 'quit' hoặc 'exit' để dừng chat.")
    print("="*50)

    while True:
        # 1. Nhập câu hỏi từ bàn phím
        user_message = input("\n[👤 Khách hàng]: ")
        
        if user_message.lower() in ['quit', 'exit']:
            print("Đã thoát trình test!")
            break

        print("[⏳ Bot đang gõ phím...]")
        
        try:
            # 2. Chạy luồng xử lý lõi (Gọi Gemini + Lưu Redis)
            reply = handle_message(fake_sender_id, user_message)
            
            # 3. In kết quả để test Prompt
            print(f"[🤖 Bot trả lời]: {reply}")
            
            # 4. In Lịch sử Redis ra để xem nó có nhớ không
            print("\n" + "-"*20 + " REDIS HISTORY " + "-"*20)
            history = get_history(fake_sender_id, limit=4)
            for msg in history:
                print(f" 👉 {msg['role'].upper()}: {msg['content']}")
            print("-" * 55)

        except Exception as e:
            print(f"❌ LỖI RỒI M ƠI: {e}")

if __name__ == "__main__":
    run_test()