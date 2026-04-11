import os
import json
import redis
from dotenv import load_dotenv

load_dotenv()

# Khởi tạo kết nối Redis
# decode_responses=True cực kỳ quan trọng để dữ liệu trả về là String chứ không phải Bytes
redis_client = redis.Redis(
    host=os.getenv("REDIS_HOST"),
    port=int(os.getenv("REDIS_PORT", 6379)),
    password=os.getenv("REDIS_PASSWORD"),
    decode_responses=True
)

def add_message(sender_id: str, role: str, content: str):
    """Lưu một tin nhắn mới vào lịch sử của user"""
    key = f"chat_history:{sender_id}"
    message = json.dumps({"role": role, "content": content})
    
    try:
        # rpush: Thêm tin nhắn vào cuối danh sách
        redis_client.rpush(key, message)
        
        # ltrim: Chỉ giữ lại 20 tin nhắn gần nhất (chống tràn RAM và tiết kiệm Token AI)
        redis_client.ltrim(key, -20, -1)
        
        # expire: Set thời gian hết hạn là 24h (86400 giây). 
        # Sau 24h không tương tác, lịch sử tự bay màu.
        redis_client.expire(key, 86400)
    except Exception as e:
        print(f"Lỗi khi lưu lịch sử vào Redis: {e}")

def get_history(sender_id: str, limit: int = 10) -> list:
    """Lấy N tin nhắn gần nhất để nhét vào Prompt cho AI"""
    key = f"chat_history:{sender_id}"
    
    try:
        # lrange: Lấy `limit` tin nhắn từ cuối lên
        messages_json = redis_client.lrange(key, -limit, -1)
        
        # Chuyển đổi từ String JSON sang mảng Dictionary cho Gemini dễ đọc
        return [json.loads(msg) for msg in messages_json]
    except Exception as e:
        print(f"Lỗi khi đọc lịch sử từ Redis: {e}")
        return []

def clear_history(sender_id: str):
    """(Tuỳ chọn) Hàm dùng để xoá trắng lịch sử khi cần"""
    key = f"chat_history:{sender_id}"
    redis_client.delete(key)