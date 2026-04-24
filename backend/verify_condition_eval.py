from backend.services.condition_evaluator import evaluate_condition
import os

def test_condition(message, condition):
    result = evaluate_condition(message, condition)
    print(f"Message: '{message}' | Condition: '{condition}' | Result: {result}")
    return result

if __name__ == "__main__":
    print("--- Testing Condition Evaluator ---")
    
    # Test cases that should be TRUE
    assert test_condition("Tôi muốn mua một ly cà phê muối", "Người dùng muốn mua cà phê") == True
    assert test_condition("Giá cái này bao nhiêu vậy shop?", "Người dùng hỏi về giá cả") == True
    assert test_condition("Thái độ nhân viên tệ quá!", "Người dùng đang không hài lòng hoặc tức giận") == True
    
    # Test cases that should be FALSE
    assert test_condition("Chào shop nhé", "Người dùng muốn mua cà phê") == False
    assert test_condition("Địa chỉ ở đâu vậy?", "Người dùng hỏi về giá cả") == False
    
    print("\n--- All tests passed! ---")
