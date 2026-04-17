"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { apiFetch } from "@/lib/auth";

type Language = "en" | "vi";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  en: {
    "nav.overview": "Overview",
    "nav.knowledge": "Knowledge",
    "nav.faq": "FAQ Setup",
    "nav.handoffs": "Handoff Inbox",
    "nav.settings": "Settings",
    "theme.light": "Light Mode",
    "theme.dark": "Dark Mode",
    "lang.toggle": "English",

    // Overview
    "overview.title": "System Overview",
    "overview.desc": "Real-time performance metrics and bot health.",
    "overview.total": "Total Interactions",
    "overview.active": "Active Users",
    "overview.confidence": "Avg. Confidence",
    "overview.handoffRate": "Handoff Rate",
    "overview.recent": "Recent Interactions",
    "table.sender": "Sender",
    "table.message": "Message",
    "table.reply": "AI Reply",
    "table.score": "Score",
    "table.status": "Status",
    "table.empty": "No interaction data logged yet.",
    "table.handoff": "Handoff",
    "table.auto": "Auto",
    "table.interactionDetails": "Interaction Details:",

    // Knowledge
    "knowledge.title": "Knowledge Base",
    "knowledge.desc": "Manage the training data and RAG retrieval sources.",
    "knowledge.addSource": "Add Source",
    "knowledge.uploadDoc": "Upload Document",
    "knowledge.uploadDesc": "Drag & drop PDF, TXT, or DOCX",
    "knowledge.webUrl": "Web URL",
    "knowledge.webDesc": "Scrape and index web pages",
    "knowledge.webPlaceholder": "Enter website URL...",
    "knowledge.sync": "Sync Content",
    "knowledge.existing": "Current Sources",
    "knowledge.processing": "Processing...",
    "knowledge.notConfigured": "Database not configured yet.",
    "knowledge.emptySources": "No existing sources found.",
    "knowledge.deleteConfirm": "Are you sure you want to delete this source and its vector data?",
    "knowledge.selectFile": "Select a .txt or .pdf file",
    "knowledge.dropHere": "Drop file here to upload",
    "knowledge.browse": "Browse Files",
    "knowledge.uploadBtn": "Upload to Backend",
    "knowledge.uploading": "Uploading...",
    "knowledge.ragTitle": "RAG Indexing",
    "knowledge.ragDesc": "After uploading files, you must trigger the indexing process to update the Supabase vector database.",
    "knowledge.indexBtn": "Trigger Re-indexing",
    "knowledge.indexing": "Indexing...",
    "knowledge.statusUploadSuccess": "File uploaded successfully! Ready to index.",
    "knowledge.statusUploadFail": "Upload failed.",
    "knowledge.statusError": "Error connecting to backend.",
    "knowledge.statusIndexSuccess": "Indexing started in background. Refresh in a moment.",
    "knowledge.statusIndexFail": "Failed to start indexing.",

    // FAQ
    "faq.title": "FAQ Setup",
    "faq.desc": "Manage custom keyword-based answers for immediate priority.",
    "faq.addNew": "Add New FAQ",
    "faq.keyword": "Keyword(s) *",
    "faq.keywordPlaceholder": "e.g. pricing",
    "faq.question": "Optional Question",
    "faq.questionPlaceholder": "e.g. What is the pricing?",
    "faq.answer": "Answer *",
    "faq.answerPlaceholder": "Our pricing starts at...",
    "faq.addBtn": "Add FAQ Entry",
    "faq.adding": "Adding...",
    "faq.existing": "Existing FAQs",
    "faq.empty": "No FAQs added yet.",
    "faq.deleteConfirm": "Are you sure you want to delete this FAQ?",

    // Handoffs
    "handoff.title": "Human Handoffs",
    "handoff.desc": "Manage situations where the AI requires human intervention.",
    "handoff.active": "Live Inbox",
    "handoff.resolved": "Resolved Queue",
    "handoff.markResolved": "Mark as Resolved",
    "handoff.loading": "Loading active requests...",
    "handoff.emptyTitle": "All caught up!",
    "handoff.emptyDesc": "No users currently waiting for human help.",
    "handoff.logicNote": "Handoff Logic Note",
    "handoff.logicDesc": "The bot automatically escalates to a human agent when user intent indicates frustration or explicit request for staff.",
    "handoff.sender": "Sender",
    "handoff.openChat": "Open Chat",
    "handoff.score": "SCORE",
    "faq.deleteTitle": "Delete FAQ",

    // Settings
    "settings.title": "Settings",
    "settings.desc": "Manage your AI bot configuration and deployment settings.",
    "settings.deployment": "Deployment",
    "settings.backendUrl": "Backend API URL",
    "settings.frontendEnv": "Frontend Environment",
    "settings.models": "AI Models",
    "settings.llm": "LLM Provider",
    "settings.embeddings": "Embedding Model",
    "settings.contextWindow": "Context Window",
    "settings.apiKeys": "API Keys",
    "settings.save": "Save Configuration",
    "settings.aiIntegration": "AI Integration",
    "settings.publicSettings": "Public Settings"
  },
  vi: {
    "nav.overview": "Tổng quan",
    "nav.knowledge": "Dữ liệu tri thức",
    "nav.faq": "Cài đặt câu hỏi",
    "nav.handoffs": "Hỗ trợ khách hàng",
    "nav.settings": "Cài đặt",
    "theme.light": "Chế độ Sáng",
    "theme.dark": "Chế độ Tối",
    "lang.toggle": "Tiếng Việt",

    // Overview
    "overview.title": "Tổng Quan Hệ Thống",
    "overview.desc": "Chỉ số hiệu suất thời gian thực & sức khỏe bot.",
    "overview.total": "Tổng Lượt Tương Tác",
    "overview.active": "Người Dùng Hoạt Động",
    "overview.confidence": "Độ Chính Xác TB",
    "overview.handoffRate": "Tham Vấn CSKH",
    "overview.recent": "Tương Tác Gần Đây",
    "table.sender": "Người Gửi",
    "table.message": "Tin Nhắn",
    "table.reply": "AI Phản Hồi",
    "table.score": "Độ Tin Cậy",
    "table.status": "Trạng Thái",
    "table.empty": "Chưa có tương tác nào được ghi nhận.",
    "table.handoff": "Nhân viên",
    "table.auto": "Tự động",
    "table.interactionDetails": "Chi Tiết Các Lượt Tương Tác:",

    // Knowledge
    "knowledge.title": "Dữ Liệu Tri Thức",
    "knowledge.desc": "Quản lý dữ liệu nội bộ và nguồn cung cấp cho RAG.",
    "knowledge.addSource": "Thêm Nguồn Mới",
    "knowledge.uploadDoc": "Tải Lên Tài Liệu",
    "knowledge.uploadDesc": "Kéo thả file PDF, TXT, hoặc DOCX",
    "knowledge.webUrl": "URL Trang Web",
    "knowledge.webDesc": "Quét và phân tích trang web",
    "knowledge.webPlaceholder": "Nhập đường dẫn website...",
    "knowledge.sync": "Đồng Bộ Hóa",
    "knowledge.existing": "Dữ Liệu Hiện Tại",
    "knowledge.processing": "Đang xử lý...",
    "knowledge.notConfigured": "Cơ sở dữ liệu chưa được định cấu hình.",
    "knowledge.emptySources": "Chưa có nguồn dữ liệu nào.",
    "knowledge.deleteConfirm": "Bạn có chắc chắn muốn xóa file này và các dữ liệu liên quan không?",
    "knowledge.selectFile": "Chọn tệp .txt hoặc .pdf",
    "knowledge.dropHere": "Thả tệp vào đây để tải lên",
    "knowledge.browse": "Chọn tệp",
    "knowledge.uploadBtn": "Tải Lên Máy Chủ",
    "knowledge.uploading": "Đang tải...",
    "knowledge.ragTitle": "Đồng Bộ Dữ Liệu RAG",
    "knowledge.ragDesc": "Sau khi tải file lên, bạn cần kích hoạt tiến trình đồng bộ để cập nhật dữ liệu vector vào Supabase.",
    "knowledge.indexBtn": "Bắt Đầu Đồng Bộ",
    "knowledge.indexing": "Đang đồng bộ...",
    "knowledge.statusUploadSuccess": "Tải file thành công! Sẵn sàng đồng bộ.",
    "knowledge.statusUploadFail": "Tải lên thất bại.",
    "knowledge.statusError": "Lỗi kết nối máy chủ.",
    "knowledge.statusIndexSuccess": "Đang đồng bộ dưới nền. Vui lòng tải lại trang sau.",
    "knowledge.statusIndexFail": "Kích hoạt đồng bộ thất bại.",

    // FAQ
    "faq.title": "Cài Đặt Câu Hỏi (FAQ)",
    "faq.desc": "Khai báo từ khóa để ưu tiên trả lời không cần AI.",
    "faq.addNew": "Thêm FAQ Mới",
    "faq.keyword": "Từ khóa kích hoạt *",
    "faq.keywordPlaceholder": "VD: bảng giá",
    "faq.question": "Nội dung câu hỏi (Tùy chọn)",
    "faq.questionPlaceholder": "VD: Xin báo giá dịch vụ?",
    "faq.answer": "Câu trả lời *",
    "faq.answerPlaceholder": "Chào bạn, bảng giá bên mình là...",
    "faq.addBtn": "Cập Nhật Câu Trả Lời",
    "faq.adding": "Đang lưu...",
    "faq.existing": "Danh Sách FAQ",
    "faq.empty": "Chưa có danh sách FAQ nào.",
    "faq.deleteConfirm": "Bạn có chắc chắn muốn xóa FAQ này không?",

    // Handoffs
    "handoff.title": "Hỗ Trợ Trực Tiếp",
    "handoff.desc": "Quản lý cuộc gọi hỗ trợ từ người thật.",
    "handoff.active": "Hộp Thư Chờ",
    "handoff.resolved": "Lịch Sử Hỗ Trợ",
    "handoff.markResolved": "Đánh Dấu Phục Vụ Xong",
    "handoff.loading": "Đang tải dữ liệu...",
    "handoff.emptyTitle": "Hoàn Tất Xuất Sắc!",
    "handoff.emptyDesc": "Không có yêu cầu chờ giải quyết lúc này.",
    "handoff.logicNote": "Quy Trình Chuyển Giao",
    "handoff.logicDesc": "Hệ thống AI tự động nhắc nhở nhân viên khi nhận thấy người dùng cần hỗ trợ khẩn cấp.",
    "handoff.sender": "Khách hàng",
    "handoff.openChat": "Mở chat",
    "handoff.score": "MỨC ĐỘ",
    "faq.deleteTitle": "Xóa FAQ",

    // Settings
    "settings.title": "Cài Đặt",
    "settings.desc": "Cấu hình AI bot và kết nối nền tảng.",
    "settings.deployment": "Hiện Trạng Triển Khai",
    "settings.backendUrl": "Đường Dẫn API",
    "settings.frontendEnv": "Môi Trường Giao Diện",
    "settings.models": "Mô Hình AI",
    "settings.llm": "Nhà Cung Cấp LLM",
    "settings.embeddings": "Mô Hình Vector Nhúng",
    "settings.contextWindow": "Bộ Nhớ Ngữ Cảnh Tối Đa",
    "settings.apiKeys": "Khóa Bảo Mật API",
    "settings.save": "Lưu Thay Đổi (Chưa Kích Hoạt)",
    "settings.aiIntegration": "Tích Hợp AI",
    "settings.publicSettings": "Cài Đặt Chung"
  }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    apiFetch("/api/settings/language")
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data && data.value && (data.value === "en" || data.value === "vi")) {
          setLanguageState(data.value);
        }
      })
      .catch(err => console.error("Failed to load language settings:", err));
  }, []);

  const setLanguage = async (newLang: Language) => {
    setLanguageState(newLang);
    try {
      await apiFetch("/api/settings", {
        method: "POST",
        body: JSON.stringify({ setting_key: "language", setting_value: newLang })
      });
    } catch (err) {
      console.error("Failed to save language settings:", err);
    }
  };

  const t = (key: string): string => {
    return translations[language][key] || translations["en"][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used within LanguageProvider");
  return context;
};
