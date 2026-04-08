import os
import glob
from sentence_transformers import SentenceTransformer
from langchain_text_splitters import RecursiveCharacterTextSplitter
from ..database import supabase

class IngestionService:
    def __init__(self):
        print("Initializing Ingestion Service...")
        # Load local embedding model
        self.embedder = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")
        
        # Setup text splitter
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=150,
            separators=["\n\n", "\n", " ", ""]
        )

    def ingest_file(self, filepath: str):
        if not supabase:
            print("Supabase not initialized.")
            return

        filename = os.path.basename(filepath)
        print(f"Processing {filename}...")
        
        with open(filepath, "r", encoding="utf-8") as f:
            content = f.read()

        # Split into chunks
        chunks = self.text_splitter.split_text(content)
        
        for i, chunk in enumerate(chunks):
            embedding = self.embedder.encode(chunk).tolist()
            
            # Insert to Supabase DB table `documents`
            try:
                supabase.table("documents").insert({
                    "content": chunk,
                    "metadata": {"source": filename, "chunk_id": i},
                    "embedding": embedding
                }).execute()
                print(f"  > Inserted chunk {i+1}/{len(chunks)} of {filename}")
            except Exception as e:
                print(f"  > Failed to insert chunk {i}: {e}")

    def ingest_directory(self, data_dir: str):
        if not os.path.exists(data_dir):
            print(f"Data directory not found at {data_dir}")
            return

        txt_files = glob.glob(os.path.join(data_dir, "*.txt"))
        if not txt_files:
            print(f"No .txt files found in {data_dir}")
            return

        for filepath in txt_files:
            self.ingest_file(filepath)
