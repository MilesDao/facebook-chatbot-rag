
from langchain_google_genai import ChatGoogleGenerativeAI

my_api_key = "GOOGLE_API_KEY"

llm = ChatGoogleGenerativeAI(
    model="gemini-3.1-flash-lite-preview",
    api_key=my_api_key  
)

print("Đang hỏi Gemini 2.5...")
cau_hoi = "hãy nói vừ usth trong 3 câu "
ket_qua = llm.invoke(cau_hoi)


print("\n--- CÂU TRẢ LỜI CỦA AI ---")
print(ket_qua.content)