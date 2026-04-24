import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

url = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY")

print(f"URL: {url}")
print(f"Key found: {bool(key)}")

supabase = create_client(url, key)

try:
    res = supabase.table("documents").select("user_id").limit(5).execute()
    print(f"Documents found: {res.data}")
except Exception as e:
    print(f"Error: {e}")
