from fastapi import FastAPI, Request, Response, BackgroundTasks
from supabase import create_client, Client
import requests
import time

app = FastAPI()

SUPABASE_URL = "ĐIỀN_URL_DỰ_ÁN_SUPABASE"
SUPABASE_KEY = "ĐIỀN_SERVICE_ROLE_KEY_CỦA_SUPABASE" 
VERIFY_TOKEN = os.getenv("vssa_rag_secret_2026")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)


@app.get("/webhook")
async def verify_webhook(request: Request):
    mode = request.query_params.get("hub.mode")
    token = request.query_params.get("hub.verify_token")
    challenge = request.query_params.get("hub.challenge")

    if mode == "subscribe" and token == VERIFY_TOKEN:
        print("Facebook xác minh Webhook thành công!")
        return Response(content=challenge, status_code=200)
    return Response(content="Forbidden", status_code=403)


@app.post("/webhook")
async def receive_message(request: Request, background_tasks: BackgroundTasks):
    body = await request.json()
    
    if body.get("object") == "page":
        for entry in body.get("entry", []):
            webhook_event = entry.get("messaging", [{}])[0]
            sender_id = webhook_event.get("sender", {}).get("id")
            message = webhook_event.get("message", {})

         
            if "attachments" in message:
                for attachment in message["attachments"]:
                    if attachment["type"] == "image":
                        image_url = attachment["payload"]["url"]
 
                        background_tasks.add_task(handle_image_upload, sender_id, image_url)

    return Response(content="EVENT_RECEIVED", status_code=200)

def handle_image_upload(sender_id: str, image_url: str):
    try:
        print(f"Phát hiện ảnh mới từ khách (ID: {sender_id}). Đang tải...")
        
  
        img_response = requests.get(image_url)
        img_data = img_response.content

        file_name = f"{sender_id}/{int(time.time())}.jpg"


        supabase.storage.from_("customer-images").upload(
            file_name,
            img_data,
            file_options={"content-type": "image/jpeg"}
        )


        public_url = supabase.storage.from_("customer-images").get_public_url(file_name)


        supabase.table("customer_uploads").insert({
            "messenger_user_id": sender_id,
            "public_url": public_url
        }).execute()
        
        print(f"--> Đã lưu ảnh thành công vào DB và hiển thị trên UI Admin!")
    except Exception as e:
        print(f"Lỗi khi xử lý ảnh: {e}")