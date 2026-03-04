-- Migration: Admin tables for FAQ management and voice logging (FR14, FR15)

-- FAQ knowledge base table (FR14)
CREATE TABLE IF NOT EXISTS faqs (
  id TEXT PRIMARY KEY,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Voice interaction logs table (FR15)
CREATE TABLE IF NOT EXISTS voice_logs (
  id TEXT PRIMARY KEY,
  session_id TEXT,
  user_id TEXT,
  user_text TEXT NOT NULL,
  response_text TEXT NOT NULL,
  intent TEXT,
  created_at TEXT NOT NULL
);

-- Seed some initial FAQ data
INSERT OR IGNORE INTO faqs (id, question, answer, category, created_at, updated_at) VALUES
  ('faq-001', 'Chính sách đổi trả như thế nào?', 'TGDD hỗ trợ đổi trả trong vòng 30 ngày kể từ ngày mua, sản phẩm còn nguyên tem mác, chưa qua sửa chữa.', 'policy', datetime('now'), datetime('now')),
  ('faq-002', 'Thời gian bảo hành là bao lâu?', 'Sản phẩm điện thoại được bảo hành 12 tháng, laptop bảo hành 24 tháng tại hệ thống TGDD trên toàn quốc.', 'warranty', datetime('now'), datetime('now')),
  ('faq-003', 'TGDD có giao hàng tận nơi không?', 'Có, TGDD giao hàng miễn phí toàn quốc cho đơn hàng từ 500.000 VND. Thời gian giao hàng từ 1-3 ngày làm việc.', 'delivery', datetime('now'), datetime('now')),
  ('faq-004', 'Làm sao để trả góp 0%?', 'Khách hàng có thể trả góp 0% lãi suất qua thẻ tín dụng các ngân hàng liên kết hoặc ứng dụng trả góp như Home Credit, FE Credit.', 'payment', datetime('now'), datetime('now')),
  ('faq-005', 'Hotline hỗ trợ khách hàng là gì?', 'Hotline TGDD: 1800 2091 (miễn phí, 7:30 - 22:00 hàng ngày kể cả lễ Tết).', 'support', datetime('now'), datetime('now')),
  ('faq-006', 'TGDD có thu cũ đổi mới không?', 'Có, TGDD có chương trình thu cũ đổi mới với mức thu hấp dẫn. Mang thiết bị cũ đến bất kỳ cửa hàng TGDD để được định giá miễn phí.', 'trade_in', datetime('now'), datetime('now'));
