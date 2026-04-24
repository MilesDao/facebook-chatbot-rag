import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

serve(async (req) => {
  // Phần xác thực vẫn giữ nguyên để Facebook không báo lỗi
  if (req.method === "GET") {
    const url = new URL(req.url);
    return new Response(url.searchParams.get("hub.challenge"), { status: 200 });
  }

  // PHẦN XỬ LÝ ẢNH (POST)
  if (req.method === "POST") {
    const body = await req.json();
    const messaging = body.entry?.[0]?.messaging?.[0];

    // Kiểm tra xem có phải tin nhắn chứa ảnh không
    if (messaging?.message?.attachments?.[0]?.type === 'image') {
      const imageUrl = messaging.message.attachments[0].payload.url;
      
      // 1. Tải ảnh từ Facebook về
      const imageRes = await fetch(imageUrl);
      const imageBlob = await imageRes.blob();
      const fileName = `uploads/${crypto.randomUUID()}.png`;

      // 2. Upload lên Supabase Storage
      await supabase.storage.from('messenger-images').upload(fileName, imageBlob);

      // 3. Lưu thông tin vào Database
      await supabase.from('customer_uploads').insert({
        file_path: fileName,
        sender_id: messaging.sender.id
      });
    }
  }

  return new Response("OK", { status: 200 });
})