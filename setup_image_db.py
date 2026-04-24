from backend.database import supabase
import sys

def main():
    if not supabase:
        print("no supabase")
        sys.exit(1)
        
    print("Checking buckets...")
    try:
        buckets = supabase.storage.list_buckets()
        bucket_names = [b.name for b in buckets]
        print("Existing buckets:", bucket_names)
        if "customer-images" not in bucket_names:
            print("Creating bucket customer-images...")
            supabase.storage.create_bucket("customer-images", {"public": True})
            print("Bucket created.")
    except Exception as e:
        print("Error checking/creating bucket:", e)
        
    print("Checking table customer_uploads...")
    try:
        # Just try to select from customer_uploads
        supabase.table("customer_uploads").select("id").limit(1).execute()
        print("Table customer_uploads exists.")
    except Exception as e:
        print("customer_uploads table doesn't exist or error:", e)
        print("Should execute SQL to create it.")

if __name__ == "__main__":
    main()
