"use client"; // Thêm dòng này nếu bạn đang dùng Next.js App Router (src/app)

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient'; // Nhớ trỏ đúng đường dẫn file vừa tạo
import Image from 'next/image';

// Định nghĩa kiểu dữ liệu cho bản ghi
interface UploadedDocument {
  id: string;
  messenger_user_id: string;
  public_url: string;
  created_at: string;
}

export default function DocumentGallery() {
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);
  const [loading, setLoading] = useState(true);

  // Hàm gọi dữ liệu từ Supabase
  const fetchDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('customer_uploads')
        .select('*')
        .order('created_at', { ascending: false }); // Xếp ảnh mới nhất lên đầu

      if (error) throw error;
      
      if (data) {
        setDocuments(data);
      }
    } catch (error) {
      console.error('Lỗi khi lấy dữ liệu ảnh:', error);
    } finally {
      setLoading(false);
    }
  };

  // Tự động chạy hàm lấy dữ liệu khi trang vừa load
  useEffect(() => {
    fetchDocuments();
  }, []);

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Đang tải tài liệu...</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Tài liệu khách hàng gửi (Messenger)</h1>
      
      {documents.length === 0 ? (
        <p className="text-gray-500">Chưa có khách hàng nào gửi ảnh.</p>
      ) : (
        /* CSS Grid chia cột: màn hình nhỏ 1 cột, vừa 2 cột, to 3 cột */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {documents.map((doc, idx) => (
            <div key={doc.public_url || idx} className="border rounded-lg overflow-hidden shadow-sm bg-white">
              {/* Vùng hiển thị ảnh */}
              <div className="relative w-full h-48 bg-gray-100">
                {/* Dùng thẻ <img> thường hoặc <Image> của Next.js tùy cấu hình config */}
                <img 
                  src={doc.public_url} 
                  alt={`Tài liệu từ user ${doc.messenger_user_id}`}
                  className="object-contain w-full h-full"
                />
              </div>
              
              {/* Thông tin bên dưới ảnh */}
              <div className="p-4 border-t">
                <p className="text-sm font-semibold text-gray-700 truncate">
                  User ID: {doc.messenger_user_id}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Ngày nhận: {new Date(doc.created_at).toLocaleString('vi-VN')}
                </p>
                <a 
                  href={doc.public_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-block mt-3 text-sm text-blue-600 hover:underline"
                >
                  Xem ảnh gốc &rarr;
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
