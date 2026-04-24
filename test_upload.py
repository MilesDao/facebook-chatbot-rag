import os
import time
import requests
from backend.database import supabase

def test():
    if not supabase:
        print("Supabase client not initialized")
        return
        
    img_data = b"test_image_data"
    file_name = f"test_{int(time.time()*1000)}.jpg"
    
    try:
        res = supabase.storage.from_("customer-images").upload(
            file_name,
            img_data,
            {"content-type": "image/jpeg"}
        )
        print("Upload result success?")
        
        public_url = supabase.storage.from_("customer-images").get_public_url(file_name)
        print("Public URL:", public_url)
        
        res_db = supabase.table("customer_uploads").insert({
            "messenger_user_id": "test",
            "public_url": public_url
        }).execute()
        print("DB Insert result:", res_db.data)
        
    except Exception as e:
        print("Error:", e)

test()
