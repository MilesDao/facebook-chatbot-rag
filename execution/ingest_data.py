import os
import glob
from sentence_transformers import SentenceTransformer
from supabase import create_client, Client
from langchain_text_splitters import RecursiveCharacterTextSplitter
from dotenv import load_dotenv

load_dotenv()

# Set HF_TOKEN to avoid unauthenticated warnings
hf_token = os.getenv("HF_TOKEN") or os.getenv("HUGGINGFACE_API_KEY")
if hf_token:
    os.environ["HF_TOKEN"] = hf_token

# Initialize Supabase
url: str = os.getenv("SUPABASE_URL", "")
key: str = os.getenv("SUPABASE_KEY", "")

if not url or not key:
    print("Error: Supabase config missing.")
    exit(1)

supabase: Client = create_client(url, key)

print("Loading Local Embedding Model (sentence-transformers/all-MiniLM-L6-v2)...")
embedder = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")

# Setup generic recursive text splitter
text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=1000,
    chunk_overlap=150,
    separators=["\n\n", "\n", " ", ""]
)

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")

def ingest_all_files():
    if not os.path.exists(DATA_DIR):
        print(f"Data directory not found at {DATA_DIR}")
        return

    txt_files = glob.glob(os.path.join(DATA_DIR, "*.txt"))
    if not txt_files:
        print("No .txt files found in data/")
        return

    for filepath in txt_files:
        filename = os.path.basename(filepath)
        print(f"Processing {filename}...")
        
        with open(filepath, "r", encoding="utf-8") as f:
            content = f.read()

        # Split into chunks using Langchain
        chunks = text_splitter.split_text(content)
        
        for i, chunk in enumerate(chunks):
            embedding = embedder.encode(chunk).tolist()
            
            # Insert to Supabase DB table `documents`
            try:
                response = supabase.table("documents").insert({
                    "content": chunk,
                    "metadata": {"source": filename, "chunk_id": i},
                    "embedding": embedding
                }).execute()
                print(f"  > Inserted chunk {i+1}/{len(chunks)} of {filename}")
            except Exception as e:
                print(f"  > Failed to insert chunk {i}: {e}")

if __name__ == "__main__":
    ingest_all_files()
    print("\nIngestion complete!")
