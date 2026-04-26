import os
import glob
from google import genai
from langchain_text_splitters import RecursiveCharacterTextSplitter
import hashlib
from ..database import supabase
from dotenv import load_dotenv

load_dotenv()

class IngestionService:
    def __init__(self, api_key: str = None):
        print("Initializing Ingestion Service with Google GenAI SDK")
        self.api_key = api_key or os.getenv("GOOGLE_API_KEY")
        if not self.api_key:
            print("CRITICAL: GOOGLE_API_KEY missing in IngestionService")
        
        if not self.api_key:
            print("CRITICAL: No Google API Key provided and GOOGLE_API_KEY env var not set.")
        self.client = genai.Client(api_key=self.api_key) if self.api_key else None

        
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=150,
            separators=["\n\n", "\n", " ", ""]
        )

    def _calculate_hash(self, filepath: str) -> str:
        """Calculate SHA256 hash of a file's content."""
        sha256_hash = hashlib.sha256()
        try:
            with open(filepath, "rb") as f:
                # Read in chunks to handle large files
                for byte_block in iter(lambda: f.read(4096), b""):
                    sha256_hash.update(byte_block)
            return sha256_hash.hexdigest()
        except Exception as e:
            print(f"Error calculating hash for {filepath}: {e}")
            return ""

    def ingest_file(self, filepath: str, workspace_id: str = None):
        if not self.api_key or not supabase:    
            print("Error: Google API Key or Supabase not initialized.")
            return

        filename = os.path.basename(filepath)
        file_hash = self._calculate_hash(filepath)
        
        if not file_hash:
            print(f"Skipping {filename}: Could not calculate hash.")
            return

        print(f"Processing {filename} (Hash: {file_hash[:10]}...)")
        
        content = ""
        if filepath.lower().endswith(".txt"):
            chunks_io: list[str] = []
            with open(filepath, "r", encoding="utf-8") as f:
                while True:
                    block = f.read(65536)  # 64 KB per read
                    if not block:
                        break
                    chunks_io.append(block)
            content = "".join(chunks_io)
        elif filepath.lower().endswith(".pdf"):
            try:
                from pypdf import PdfReader
                reader = PdfReader(filepath)
                for page in reader.pages:
                    text = page.extract_text()
                    if text:
                        content += text + "\n"
            except Exception as e:
                print(f"Failed to read PDF {filename}: {e}")
                return
        else:
            print(f"Unsupported file type: {filename}")
            return

        if not content.strip():
            print(f"No content extracted from {filename}")
            return

        chunks = self.text_splitter.split_text(content)
        
        try:
            print(f"Generating embeddings for {len(chunks)} chunks in a single batch...")
            result = self.client.models.embed_content(
                model="gemini-embedding-001",
                contents=chunks,
                config=genai.types.EmbedContentConfig(output_dimensionality=1536)
            )
            
            if not result.embeddings:
                print("Error: No embedding data received from Google GenAI")
                return
            embeddings = [e.values for e in result.embeddings]
        except Exception as e:
            print(f"Failed to generate embeddings batch for {filename}: {e}")
            return
            
        for i, (chunk, raw_embed) in enumerate(zip(chunks, embeddings)):
            # Truncate to 1536 dimensions to fit Supabase index limits
            embedding = raw_embed[:1536]
            if len(embedding) < 1536:
                embedding += [0.0] * (1536 - len(embedding))
            
            try:
                data = {
                    "content": chunk,
                    "metadata": {"source": filename, "chunk_id": i, "file_hash": file_hash},
                    "embedding": embedding 
                }
                if workspace_id:
                    data["workspace_id"] = workspace_id
                    
                supabase.table("documents").insert(data).execute()
                print(f"  > Inserted chunk {i+1}/{len(chunks)} of {filename}")
            except Exception as e:
                print(f"  > Failed to insert chunk {i+1}: {e}")

    def ingest_directory(self, data_dir: str, workspace_id: str = None):
        if not os.path.exists(data_dir):
            print(f"Data directory not found at {data_dir}")
            return

        # 1. Get already indexed hashes from Supabase
        existing_hashes = set()
        try:
            if supabase:
                # Select only metadata to find hashes
                res = supabase.table("documents").select("metadata").eq("workspace_id", workspace_id).execute()
                for doc in res.data:
                    h = doc.get("metadata", {}).get("file_hash")
                    if h:
                        existing_hashes.add(h)
            print(f"Found {len(existing_hashes)} unique files already indexed in DB for workspace {workspace_id}")
        except Exception as e:
            print(f"Warning: Could not fetch existing hashes, will proceed. Error: {e}")

        # 2. Support both .txt and .pdf
        all_files = glob.glob(os.path.join(data_dir, "*.txt")) + glob.glob(os.path.join(data_dir, "*.pdf"))
        
        # 3. Filter out files with duplicate content (hash-based)
        files_to_process = []
        for f in all_files:
            h = self._calculate_hash(f)
            if h and h not in existing_hashes:
                files_to_process.append(f)
            elif h in existing_hashes:
                print(f"Skipping {os.path.basename(f)}: Content already exists in Database (Hash match).")

        if not files_to_process:
            print(f"No new content to index in {data_dir}.")
            return

        print(f"Starting ingestion for {len(files_to_process)} files with new content...")
        for filepath in files_to_process:
            self.ingest_file(filepath, workspace_id=workspace_id)
