import asyncio
import os
from dotenv import load_dotenv
from io import BytesIO
import requests
from PIL import Image
import uuid
import time

# Load env from root
load_dotenv()

# We need to import the functions from backend.main
# But since we are in the root, we might need some path magic or just copy the logic for testing
# For a quick test, I'll use the same logic as in main.py but in a standalone script

from backend.database import supabase
from backend.services.workspace_service import get_workspace_id_for_page

async def test_pdf_generation():
    print("--- Testing PDF Generation Logic ---")
    
    # Use a sample public image URL
    sample_images = [
        "https://raw.githubusercontent.com/python-pillow/Pillow/master/docs/conf.py", # Not an image, just testing error handling
        "https://raw.githubusercontent.com/python-pillow/Pillow/master/src/PIL/Image.py" # Not an image
    ]
    # Replace with real image URLs for better testing
    sample_images = ["https://picsum.photos/200/300", "https://picsum.photos/200/300"]
    
    sender_id = "test_sender_" + uuid.uuid4().hex[:6]
    page_id = "1234567890" # Replace with a real page_id from your bot_settings if possible
    
    # Find a real page_id from DB
    settings = supabase.table("bot_settings").select("page_id").limit(1).execute()
    if settings.data:
        page_id = settings.data[0]["page_id"]
        print(f"Using real page_id from DB: {page_id}")
    else:
        print("Warning: No bot_settings found. Test might fail on workspace resolution.")

    # 1. Fetch images
    images = []
    for url in sample_images:
        try:
            r = requests.get(url, timeout=15)
            if r.status_code == 200:
                img = Image.open(BytesIO(r.content)).convert("RGB")
                images.append(img)
                print(f"Fetched image from {url}")
        except Exception as e:
            print(f"Failed to fetch {url}: {e}")
            
    if not images:
        print("No images fetched. Aborting.")
        return

    # 2. Generate PDF
    pdf_bytes = BytesIO()
    images[0].save(pdf_bytes, format="PDF", save_all=True, append_images=images[1:], resolution=100.0)
    pdf_bytes.seek(0)
    file_content = pdf_bytes.read()
    print(f"Generated PDF: {len(file_content)} bytes")

    # 3. Upload to Supabase
    filename = f"test_{sender_id}_{int(time.time())}.pdf"
    print(f"Uploading to user_documents/{filename}...")
    try:
        res = supabase.storage.from_("user_documents").upload(
            filename, 
            file_content, 
            {"content-type": "application/pdf"}
        )
        print(f"Upload Result: {res}")
        
        # 4. Get URL
        public_url = supabase.storage.from_("user_documents").get_public_url(filename)
        print(f"Public URL: {public_url}")
        
        # 5. Resolve Workspace
        workspace_id = get_workspace_id_for_page(page_id)
        print(f"Resolved Workspace ID: {workspace_id}")
        
        if workspace_id:
            # 6. Insert into DB
            db_res = supabase.table("user_generated_pdfs").insert({
                "workspace_id": workspace_id,
                "sender_id": sender_id,
                "pdf_url": public_url
            }).execute()
            print(f"Database Insert Result: {db_res.data}")
            if db_res.data:
                print("SUCCESS: Test completed successfully!")
            else:
                print("FAILURE: Database insert failed.")
        else:
            print("FAILURE: Workspace could not be resolved.")
            
    except Exception as e:
        print(f"ERROR during test: {e}")

if __name__ == "__main__":
    asyncio.run(test_pdf_generation())
