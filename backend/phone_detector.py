"""
Vietnamese Phone Number Detector

Detects and extracts Vietnamese phone numbers from messages.
Supports both national and international formats.

Vietnamese phone number formats:
- National: 0[1-9]\d{8,9} (starts with 0, total 10-11 digits)
- International: +84[1-9]\d{8,9} (country code +84, total 10-11 digits)
- Alternative: 84[1-9]\d{8,9} (without + sign)
"""

import re
from typing import Optional, List, Dict, Tuple

VIETNAMESE_PHONE_PATTERNS = [
    # National format: 0 followed by 9-10 digits (with optional spaces/hyphens)
    r'\b0[1-9][\d\s\-\(\)]{7,}[0-9]\b',
    # International format with +: +84 followed by 8-9 digits (with optional spaces/hyphens)
    r'\+84[\d\s\-\(\)]{7,}[0-9]\b',
    # International format without +: 84 followed by 8-9 digits (with optional spaces/hyphens)
    r'\b84[1-9][\d\s\-\(\)]{7,}[0-9]\b',
]

class PhoneDetector:
    """Detects Vietnamese phone numbers in text."""
    
    def __init__(self):
        self.patterns = [re.compile(pattern) for pattern in VIETNAMESE_PHONE_PATTERNS]
        self.keyword_patterns = self._compile_keyword_patterns()
    
    @staticmethod
    def _compile_keyword_patterns() -> List[re.Pattern]:
        """Compile regex patterns for phone-related keywords."""
        keywords = [
            r'(số\s+điện\s+thoại|sdt|phone|điện\s+thoại|hotline|gọi|call)',
            r'(liên\s+hệ|contact\s+me|gọi\s+cho\s+tôi|hãy\s+gọi)',
            r'(số\s+lien\s+hệ|contact\s+number)',
        ]
        return [re.compile(pattern, re.IGNORECASE | re.UNICODE) for pattern in keywords]
    
    def extract_phone_numbers(self, text: str) -> List[str]:
        """Extract all Vietnamese phone numbers from text."""
        if not text:
            return []
        
        phone_numbers = []
        for pattern in self.patterns:
            matches = pattern.findall(text)
            for match in matches:
                # Clean up the matched phone number (remove spaces, hyphens, parentheses)
                cleaned = re.sub(r'[\s\-\(\)]', '', match)
                # Validate that it's a proper length after cleaning
                if cleaned and (len(cleaned) >= 10):
                    phone_numbers.append(cleaned)
        
        return list(set(phone_numbers))  # Remove duplicates
    
    def is_phone_request(self, text: str) -> bool:
        """Check if message is requesting/mentioning a phone number."""
        if not text:
            return False
        
        for pattern in self.keyword_patterns:
            if pattern.search(text):
                return True
        return False
    
    def detect_phone_with_context(self, text: str) -> Tuple[Optional[str], Dict[str, any]]:
        """
        Detect phone number and context (keyword-triggered or auto-detected).
        
        Returns:
            Tuple of (phone_number, context_dict)
            - phone_number: The detected phone number or None
            - context_dict: {
                'found': bool,
                'triggered_by_keyword': bool,
                'phone_number': str or None,
                'confidence': float (0.0-1.0)
            }
        """
        extracted_phones = self.extract_phone_numbers(text)
        is_keyword_request = self.is_phone_request(text)
        
        phone_number = None
        confidence = 0.0
        triggered_by_keyword = False
        
        if extracted_phones:
            phone_number = extracted_phones[0]  # Use first detected number
            
            if is_keyword_request:
                confidence = 0.95  # High confidence if keyword-triggered
                triggered_by_keyword = True
            else:
                confidence = 0.8  # Slightly lower confidence for auto-detection
                triggered_by_keyword = False
        
        context = {
            'found': phone_number is not None,
            'triggered_by_keyword': triggered_by_keyword,
            'phone_number': phone_number,
            'confidence': confidence
        }
        
        return phone_number, context
    
    def normalize_phone(self, phone: str) -> str:
        """Normalize phone number to standard Vietnamese format (+84 international)."""
        if not phone:
            return phone
        
        # Remove any spaces or hyphens
        phone = re.sub(r'[\s\-\(\)]', '', phone)
        
        # Convert national format (0...) to international (+84...)
        if phone.startswith('0') and len(phone) >= 10:
            phone = '+84' + phone[1:]
        elif phone.startswith('84') and not phone.startswith('+84'):
            phone = '+' + phone
        
        return phone
    
    def validate_phone(self, phone: str) -> bool:
        """Validate that a phone number matches expected Vietnamese format."""
        if not phone:
            return False
        
        # Clean the phone first
        cleaned = re.sub(r'[\s\-\(\)]', '', phone)
        
        # Check if it's a valid Vietnamese phone number length and format
        if cleaned.startswith('+84'):
            return len(cleaned) >= 12 and len(cleaned) <= 13
        elif cleaned.startswith('84'):
            return len(cleaned) >= 11 and len(cleaned) <= 12
        elif cleaned.startswith('0'):
            return len(cleaned) >= 10 and len(cleaned) <= 11
        
        return False


def extract_phone_from_message(text: str) -> Tuple[Optional[str], Dict]:
    """Convenience function to extract phone number from a message."""
    detector = PhoneDetector()
    return detector.detect_phone_with_context(text)


def normalize_vietnamese_phone(phone: str) -> str:
    """Convenience function to normalize a Vietnamese phone number."""
    detector = PhoneDetector()
    return detector.normalize_phone(phone)
