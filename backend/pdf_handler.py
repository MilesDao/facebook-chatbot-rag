import requests
import io
from PIL import Image
from supabase import create_client, Client
import time

# Khởi tạo Supabase Client (Nhớ thay bằng Key của mày)
SUPABASE_URL = "https://xyz.supabase.co"
SUPABASE_KEY = "your-anon-key"
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def process_and_upload_pdf(image_urls, student_id):
    """
    Nhận list link ảnh, gộp thành PDF và up lên Supabase.
    Trả về link PDF công khai cho đối tác.
    """
    try:
        image_objects = []
        
        print("1. Đang tải ảnh từ Messenger về...")
        for url in image_urls:
            response = requests.get(url)
            # Mở ảnh bằng Pillow từ bộ nhớ tạm
            img = Image.open(io.BytesIO(response.content))
            
            # Quan trọng: Phải chuyển ảnh sang hệ màu RGB thì mới lưu thành PDF được
            if img.mode != 'RGB':
                img = img.convert('RGB')
            image_objects.append(img)
            
        if not image_objects:
            return None

        print("2. Đang gộp ảnh thành PDF...")
        # Tạo 1 vùng nhớ tạm để lưu file PDF (không lưu ra ổ cứng)
        pdf_bytes = io.BytesIO()
        
        # Lấy ảnh đầu tiên làm gốc, append (nối) các ảnh còn lại vào sau
        image_objects[0].save(
            pdf_bytes, 
            format='PDF', 
            save_all=True, 
            append_images=image_objects[1:]
        )
        # Đưa con trỏ đọc về đầu file
        pdf_bytes.seek(0)
        
        print("3. Đang Upload lên Supabase Storage...")
        # Đặt tên file theo ID học sinh và timestamp cho khỏi trùng
        file_name = f"HoSo_{student_id}_{int(time.time())}.pdf"
        bucket_name = "student_profiles" # Mày phải tạo Bucket này trên Supabase trước nhé
        
        # Upload thẳng luồng byte lên
        res = supabase.storage.from_(bucket_name).upload(
            file_name, 
            pdf_bytes.read(), 
            {"content-type": "application/pdf"}
        )
        
        print("4. Lấy link public...")
        public_url = supabase.storage.from_(bucket_name).get_public_url(file_name)
        
        return public_url

    except Exception as e:
        print(f"Lỗi rồi fen ơi: {e}")
        return None