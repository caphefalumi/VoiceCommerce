import { createFileRoute } from '@tanstack/react-router';
import { useState, useEffect, useCallback } from 'react';
import { API_BASE } from '../lib/api';
import { useAuthStore } from '../store/auth';
import { Button } from '../components/ui/button';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Faq {
  id: string;
  question: string;
  answer: string;
  category: string;
  created_at: string;
  updated_at: string;
}

interface VoiceLog {
  id: string;
  session_id: string;
  user_id: string | null;
  user_text: string;
  response_text: string;
  intent: string | null;
  created_at: string;
}

interface Ticket {
  id: string;
  short_id: string;
  user_id: string | null;
  category: string;
  category_label: string;
  message: string;
  status: string;
  created_at: string;
}

type Tab = 'faqs' | 'logs' | 'tickets';

const INTENT_COLORS: Record<string, string> = {
  searchProducts: 'bg-blue-100 text-blue-800',
  filterProductsByPrice: 'bg-cyan-100 text-cyan-800',
  compareProducts: 'bg-purple-100 text-purple-800',
  addToCart: 'bg-green-100 text-green-800',
  removeFromCart: 'bg-orange-100 text-orange-800',
  startCheckout: 'bg-yellow-100 text-yellow-800',
  getOrderStatus: 'bg-indigo-100 text-indigo-800',
  getFaqAnswer: 'bg-pink-100 text-pink-800',
  createSupportTicket: 'bg-red-100 text-red-800',
};

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-red-100 text-red-700',
  in_progress: 'bg-yellow-100 text-yellow-700',
  resolved: 'bg-green-100 text-green-700',
  closed: 'bg-gray-100 text-gray-700',
};

const FAQ_CATEGORIES = [
  'general',
  'policy',
  'delivery',
  'payment',
  'warranty',
  'trade_in',
  'support',
];

// ─── Admin Page ───────────────────────────────────────────────────────────────

function AdminPage() {
  const user = useAuthStore((s) => s.user);
  const [activeTab, setActiveTab] = useState<Tab>('faqs');

  // ── FAQ State ──
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [faqLoading, setFaqLoading] = useState(false);
  const [editingFaq, setEditingFaq] = useState<Faq | null>(null);
  const [newFaq, setNewFaq] = useState({ question: '', answer: '', category: 'general' });
  const [showFaqForm, setShowFaqForm] = useState(false);
  const [faqError, setFaqError] = useState<string | null>(null);

  // ── Voice Logs State ──
  const [logs, setLogs] = useState<VoiceLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  // ── Tickets State ──
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);

  // ── FAQ CRUD ──────────────────────────────────────────────────────────────

  const loadFaqs = useCallback(async () => {
    setFaqLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/faqs`);
      const data = await res.json();
      setFaqs(data.faqs || []);
    } catch {
      setFaqError('Không thể tải danh sách FAQ');
    } finally {
      setFaqLoading(false);
    }
  }, []);

  const saveFaq = async () => {
    setFaqError(null);
    const payload = editingFaq
      ? { question: editingFaq.question, answer: editingFaq.answer, category: editingFaq.category }
      : newFaq;

    if (!payload.question.trim() || !payload.answer.trim()) {
      setFaqError('Câu hỏi và câu trả lời không được để trống');
      return;
    }

    const url = editingFaq
      ? `${API_BASE}/api/admin/faqs/${editingFaq.id}`
      : `${API_BASE}/api/admin/faqs`;
    const method = editingFaq ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json();
      setFaqError(err.error || 'Lỗi lưu FAQ');
      return;
    }

    setEditingFaq(null);
    setShowFaqForm(false);
    setNewFaq({ question: '', answer: '', category: 'general' });
    loadFaqs();
  };

  const deleteFaq = async (id: string) => {
    if (!confirm('Xóa FAQ này?')) return;
    await fetch(`${API_BASE}/api/admin/faqs/${id}`, { method: 'DELETE' });
    loadFaqs();
  };

  // ── Voice Logs ───────────────────────────────────────────────────────────

  const loadLogs = useCallback(async () => {
    setLogsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/voice-logs?limit=100`);
      const data = await res.json();
      setLogs(data.logs || []);
    } finally {
      setLogsLoading(false);
    }
  }, []);

  // ── Tickets ──────────────────────────────────────────────────────────────

  const loadTickets = useCallback(async () => {
    setTicketsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/tickets`);
      const data = await res.json();
      setTickets(data.tickets || []);
    } finally {
      setTicketsLoading(false);
    }
  }, []);

  const updateTicketStatus = async (id: string, status: string) => {
    await fetch(`${API_BASE}/api/admin/tickets/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    loadTickets();
  };

  // Load data on tab switch
  useEffect(() => {
    if (activeTab === 'faqs') loadFaqs();
    else if (activeTab === 'logs') loadLogs();
    else if (activeTab === 'tickets') loadTickets();
  }, [activeTab, loadFaqs, loadLogs, loadTickets]);

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#0f172a] text-gray-100">
      {/* Header */}
      <div className="border-b border-slate-700 bg-[#1e293b] px-6 py-4 flex items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-xl">
            🛠️
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">TGDD Admin Dashboard</h1>
            <p className="text-xs text-slate-400">Quản trị hệ thống Voice Commerce</p>
          </div>
        </div>
        <div className="ml-auto text-sm text-slate-400">
          👤 {user?.name || user?.email || 'Admin'} &nbsp;|&nbsp;{' '}
          {new Date().toLocaleDateString('vi-VN')}
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-3 gap-4 px-6 py-4 bg-[#1e293b] border-b border-slate-700">
        {[
          {
            label: 'Câu hỏi FAQ',
            value: faqs.length,
            icon: '📚',
            color: 'from-blue-500 to-cyan-500',
          },
          {
            label: 'Cuộc hội thoại',
            value: logs.length,
            icon: '🎙️',
            color: 'from-violet-500 to-purple-600',
          },
          {
            label: 'Phiếu hỗ trợ',
            value: tickets.length,
            icon: '🎫',
            color: 'from-orange-500 to-red-500',
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="flex items-center gap-3 bg-slate-800/50 rounded-xl px-4 py-3"
          >
            <div
              className={`w-10 h-10 rounded-lg bg-gradient-to-br ${stat.color} flex items-center justify-center text-lg shrink-0`}
            >
              {stat.icon}
            </div>
            <div>
              <div className="text-2xl font-bold">{stat.value}</div>
              <div className="text-xs text-slate-400">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 px-6 pt-4">
        {[
          { key: 'faqs', label: '📚 FAQ', desc: 'Quản lý kiến thức' },
          { key: 'logs', label: '🎙️ Voice Logs', desc: 'Nhật ký tương tác' },
          { key: 'tickets', label: '🎫 Tickets', desc: 'Phiếu hỗ trợ' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as Tab)}
            className={`px-5 py-2.5 rounded-t-xl text-sm font-medium transition-all ${
              activeTab === tab.key
                ? 'bg-slate-800 text-white border-t border-x border-slate-600'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="mx-6 mb-6 bg-slate-800 rounded-b-xl rounded-tr-xl border border-slate-700 overflow-hidden">
        {/* ── FAQ Tab ── */}
        {activeTab === 'faqs' && (
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold">Cơ sở kiến thức FAQ</h2>
                <p className="text-sm text-slate-400 mt-0.5">
                  Quản lý câu hỏi thường gặp — trả lời tự động qua giọng nói
                </p>
              </div>
              <Button
                onClick={() => {
                  setShowFaqForm(true);
                  setEditingFaq(null);
                  setFaqError(null);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
              >
                ＋ Thêm FAQ
              </Button>
            </div>

            {/* FAQ Form */}
            {(showFaqForm || editingFaq) && (
              <div className="mb-6 bg-slate-900 border border-slate-600 rounded-xl p-5">
                <h3 className="font-medium mb-4 text-slate-200">
                  {editingFaq ? '✏️ Chỉnh sửa FAQ' : '➕ Thêm FAQ mới'}
                </h3>
                {faqError && (
                  <div className="mb-3 text-sm text-red-400 bg-red-900/30 border border-red-700 rounded-lg px-3 py-2">
                    {faqError}
                  </div>
                )}
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Câu hỏi *</label>
                    <input
                      className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                      placeholder="Ví dụ: Chính sách đổi trả như thế nào?"
                      value={editingFaq ? editingFaq.question : newFaq.question}
                      onChange={(e) =>
                        editingFaq
                          ? setEditingFaq({ ...editingFaq, question: e.target.value })
                          : setNewFaq({ ...newFaq, question: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Câu trả lời *</label>
                    <textarea
                      rows={3}
                      className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none"
                      placeholder="Nhập câu trả lời chi tiết..."
                      value={editingFaq ? editingFaq.answer : newFaq.answer}
                      onChange={(e) =>
                        editingFaq
                          ? setEditingFaq({ ...editingFaq, answer: e.target.value })
                          : setNewFaq({ ...newFaq, answer: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Danh mục</label>
                    <select
                      className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                      value={editingFaq ? editingFaq.category : newFaq.category}
                      onChange={(e) =>
                        editingFaq
                          ? setEditingFaq({ ...editingFaq, category: e.target.value })
                          : setNewFaq({ ...newFaq, category: e.target.value })
                      }
                    >
                      {FAQ_CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button
                      onClick={saveFaq}
                      className="bg-green-600 hover:bg-green-700 text-white text-sm"
                    >
                      💾 Lưu
                    </Button>
                    <Button
                      onClick={() => {
                        setEditingFaq(null);
                        setShowFaqForm(false);
                        setFaqError(null);
                      }}
                      variant="outline"
                      className="text-sm border-slate-600 text-slate-300 hover:bg-slate-700"
                    >
                      Hủy
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* FAQ List */}
            {faqLoading ? (
              <div className="text-center py-12 text-slate-400">⏳ Đang tải...</div>
            ) : faqs.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <div className="text-4xl mb-2">📭</div>
                Chưa có FAQ nào. Nhấn "Thêm FAQ" để bắt đầu.
              </div>
            ) : (
              <div className="space-y-3">
                {faqs.map((faq) => (
                  <div
                    key={faq.id}
                    className="bg-slate-900 border border-slate-700 rounded-xl p-4 hover:border-slate-500 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-900/60 text-blue-300 border border-blue-700/50">
                            {faq.category}
                          </span>
                          <span className="text-xs text-slate-500">
                            {new Date(faq.created_at).toLocaleDateString('vi-VN')}
                          </span>
                        </div>
                        <p className="font-medium text-sm text-white mb-1">❓ {faq.question}</p>
                        <p className="text-sm text-slate-300 leading-relaxed">💬 {faq.answer}</p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={() => {
                            setEditingFaq(faq);
                            setShowFaqForm(false);
                            setFaqError(null);
                          }}
                          className="text-xs px-2.5 py-1 rounded-lg bg-blue-900/40 hover:bg-blue-800 text-blue-300 transition-colors"
                        >
                          ✏️ Sửa
                        </button>
                        <button
                          onClick={() => deleteFaq(faq.id)}
                          className="text-xs px-2.5 py-1 rounded-lg bg-red-900/40 hover:bg-red-800 text-red-400 transition-colors"
                        >
                          🗑️ Xóa
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Voice Logs Tab ── */}
        {activeTab === 'logs' && (
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold">Nhật ký tương tác giọng nói</h2>
                <p className="text-sm text-slate-400 mt-0.5">
                  Toàn bộ lịch sử cuộc hội thoại giữa người dùng và AI
                </p>
              </div>
              <button
                onClick={loadLogs}
                className="text-sm px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors"
              >
                🔄 Làm mới
              </button>
            </div>

            {logsLoading ? (
              <div className="text-center py-12 text-slate-400">⏳ Đang tải...</div>
            ) : logs.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <div className="text-4xl mb-2">🎙️</div>
                Chưa có nhật ký nào. Hãy thử nói chuyện với trợ lý giọng nói!
              </div>
            ) : (
              <div className="space-y-3">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className="bg-slate-900 border border-slate-700 rounded-xl p-4 hover:border-slate-500 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2">
                        {log.intent && (
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full font-mono ${INTENT_COLORS[log.intent] || 'bg-slate-700 text-slate-300'}`}
                          >
                            {log.intent}
                          </span>
                        )}
                        <span className="text-xs text-slate-500">
                          {log.session_id?.slice(0, 8)} ·{' '}
                          {new Date(log.created_at).toLocaleString('vi-VN')}
                        </span>
                      </div>
                      {log.user_id && (
                        <span className="text-xs text-slate-500">
                          👤 {log.user_id.slice(0, 8)}…
                        </span>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex gap-2">
                        <span className="text-blue-400 shrink-0 mt-0.5">🗣</span>
                        <p className="text-sm text-slate-200">{log.user_text}</p>
                      </div>
                      <div className="flex gap-2">
                        <span className="text-green-400 shrink-0 mt-0.5">🤖</span>
                        <p className="text-sm text-slate-300">{log.response_text}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Tickets Tab ── */}
        {activeTab === 'tickets' && (
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold">Phiếu hỗ trợ khách hàng</h2>
                <p className="text-sm text-slate-400 mt-0.5">
                  Quản lý tất cả yêu cầu hỗ trợ từ người dùng
                </p>
              </div>
              <button
                onClick={loadTickets}
                className="text-sm px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors"
              >
                🔄 Làm mới
              </button>
            </div>

            {ticketsLoading ? (
              <div className="text-center py-12 text-slate-400">⏳ Đang tải...</div>
            ) : tickets.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <div className="text-4xl mb-2">🎫</div>
                Chưa có phiếu hỗ trợ nào.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-slate-500 border-b border-slate-700">
                      <th className="pb-3 pr-4">Mã</th>
                      <th className="pb-3 pr-4">Người dùng</th>
                      <th className="pb-3 pr-4">Danh mục</th>
                      <th className="pb-3 pr-4 max-w-xs">Nội dung</th>
                      <th className="pb-3 pr-4">Trạng thái</th>
                      <th className="pb-3 pr-4">Ngày tạo</th>
                      <th className="pb-3">Hành động</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {tickets.map((ticket) => (
                      <tr key={ticket.id} className="hover:bg-slate-800/50 transition-colors">
                        <td className="py-3 pr-4">
                          <span className="font-mono text-xs text-slate-300">
                            #{ticket.short_id}
                          </span>
                        </td>
                        <td className="py-3 pr-4 text-slate-400 text-xs">
                          {ticket.user_id ? ticket.user_id.slice(0, 8) + '…' : 'Khách'}
                        </td>
                        <td className="py-3 pr-4">
                          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700 text-slate-300">
                            {ticket.category_label}
                          </span>
                        </td>
                        <td className="py-3 pr-4 max-w-xs">
                          <p className="text-slate-300 text-xs truncate">{ticket.message}</p>
                        </td>
                        <td className="py-3 pr-4">
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[ticket.status] || 'bg-slate-700 text-slate-300'}`}
                          >
                            {ticket.status === 'open'
                              ? 'Mở'
                              : ticket.status === 'in_progress'
                                ? 'Đang xử lý'
                                : ticket.status === 'resolved'
                                  ? 'Đã giải quyết'
                                  : 'Đóng'}
                          </span>
                        </td>
                        <td className="py-3 pr-4 text-xs text-slate-500">
                          {new Date(ticket.created_at).toLocaleDateString('vi-VN')}
                        </td>
                        <td className="py-3">
                          <select
                            value={ticket.status}
                            onChange={(e) => updateTicketStatus(ticket.id, e.target.value)}
                            className="text-xs bg-slate-700 border border-slate-600 rounded-lg px-2 py-1 text-slate-200 focus:outline-none focus:border-blue-500"
                          >
                            <option value="open">Mở</option>
                            <option value="in_progress">Đang xử lý</option>
                            <option value="resolved">Đã giải quyết</option>
                            <option value="closed">Đóng</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export const Route = createFileRoute('/admin')({
  component: AdminPage,
});
