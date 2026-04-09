import os
from supabase.client import create_client
from langchain_community.document_loaders import PyPDFDirectoryLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_community.vectorstores import SupabaseVectorStore

# 1. Thông tin cấu hình (Lấy trong mục Project Settings > API của Supabase)
SUPABASE_URL = "https://qffwbeldaghwlyfnsnhc.supabase.co"
SUPABASE_KEY = "sb_publishable_5EJ070mH65c4XUmBak0uag_ECktxoS-"
GOOGLE_API_KEY = "AIzaSyDSPUd-Gf-_qnWLFgFz49vrmqFBroCLLBc"

os.environ["GOOGLE_API_KEY"] = GOOGLE_API_KEY
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# 2. Khởi tạo mô hình mã hóa (Embedding)
# Dùng 768 chiều tương ứng với bảng SQL đã tạo ở Bước 1
# Bỏ chữ 'models/' ở phía trước đi
# Sửa lại dòng này trong file build_db.py
# Cách này "ép" thư viện dùng đúng model mà không bị sai đường dẫn
embeddings = GoogleGenerativeAIEmbeddings(model="embedding-001")

print("1. Đang đọc PDF...")
loader = PyPDFDirectoryLoader("raw_data")
docs = loader.load()

print("2. Đang băm nhỏ tài liệu...")
text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
chunks = text_splitter.split_documents(docs)

print("3. Đang đẩy dữ liệu lên Supabase (Vui lòng đợi)...")
vector_store = SupabaseVectorStore.from_documents(
    chunks,
    embeddings,
    client=supabase,
    table_name="documents",
    query_name="match_documents",
)

print("\n✅ XONG! Kiến thức đã nằm gọn trên Supabase Cloud.")