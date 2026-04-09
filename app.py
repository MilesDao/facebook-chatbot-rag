

from langchain_google_genai import ChatGoogleGenerativeAI

# 1. Dán đoạn mã API Key thật của bạn vào trong cặp ngoặc kép dưới đây
my_api_key = "AIzaSyDSPUd-Gf-_qnWLFgFz49vrmqFBroCLLBc"

# 2. Khởi tạo "Bộ não" Gemini 3.1 và nhét thẳng chìa khóa vào cho nó
llm = ChatGoogleGenerativeAI(
    model="gemini-3.1-flash-lite-preview",
    api_key=my_api_key  # <--- Truyền trực tiếp key vào đây!
)

# 3. Thử nghiệm hỏi AI
print("Đang hỏi Gemini 2.5...")
cau_hoi = "hãy nói vừ usth trong 3 câu "
ket_qua = llm.invoke(cau_hoi)

# 4. In câu trả lời
print("\n--- CÂU TRẢ LỜI CỦA AI ---")
print(ket_qua.content)