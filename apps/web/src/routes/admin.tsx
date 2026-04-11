import { createFileRoute } from '@tanstack/react-router';
import { useState, useEffect, useCallback } from 'react';
import { API_BASE } from '../lib/api';
import { useAuthStore } from '../store/auth';
import { Button } from '../components/ui/button';
import { Link } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';

const getAuthHeaders = (extra?: HeadersInit): Headers => {
  const headers = new Headers(extra);
  const token = localStorage.getItem('tgdd_auth_token');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  return headers;
};

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

interface VoiceSessionSummary {
  id: string;
  user_id: string | null;
  created_at: string;
  updated_at: string;
  last_intent: string | null;
  last_user_text: string | null;
  last_response_text: string | null;
  message_count: number;
}

interface VoiceMessage {
  id: string;
  session_id: string;
  user_id: string | null;
  role: 'user' | 'assistant';
  text: string;
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

function AdminPage() {
  const user = useAuthStore((s) => s.user);
  const [activeTab, setActiveTab] = useState<Tab>('faqs');

  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [faqLoading, setFaqLoading] = useState(false);
  const [editingFaq, setEditingFaq] = useState<Faq | null>(null);
  const [newFaq, setNewFaq] = useState({ question: '', answer: '', category: 'general' });
  const [showFaqForm, setShowFaqForm] = useState(false);
  const [faqError, setFaqError] = useState<string | null>(null);

  const [logs, setLogs] = useState<VoiceLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [sessions, setSessions] = useState<VoiceSessionSummary[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [sessionMessages, setSessionMessages] = useState<VoiceMessage[]>([]);
  const [sessionMessagesLoading, setSessionMessagesLoading] = useState(false);

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);

  const loadFaqs = useCallback(async () => {
    setFaqLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/faqs`, {
        credentials: 'include',
        headers: getAuthHeaders(),
      });
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
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      credentials: 'include',
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
    await fetch(`${API_BASE}/api/admin/faqs/${id}`, {
      method: 'DELETE',
      credentials: 'include',
      headers: getAuthHeaders(),
    });
    loadFaqs();
  };

  const loadLogs = useCallback(async () => {
    setLogsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/voice-logs?limit=100`, {
        credentials: 'include',
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      setLogs(data.logs || []);
    } finally {
      setLogsLoading(false);
    }
  }, []);

  const loadVoiceSessions = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/voice-sessions?limit=100`, {
        credentials: 'include',
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      setSessions(data.sessions || []);
    } catch {
      setSessions([]);
    }
  }, []);

  const loadSessionMessages = useCallback(async (sessionId: string) => {
    setSessionMessagesLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/voice-sessions/${sessionId}/messages`, {
        credentials: 'include',
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      setSessionMessages(data.messages || []);
    } catch {
      setSessionMessages([]);
    } finally {
      setSessionMessagesLoading(false);
    }
  }, []);

  const loadTickets = useCallback(async () => {
    setTicketsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/tickets`, {
        credentials: 'include',
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      setTickets(data.tickets || []);
    } finally {
      setTicketsLoading(false);
    }
  }, []);

  const updateTicketStatus = async (id: string, status: string) => {
    await fetch(`${API_BASE}/api/admin/tickets/${id}/status`, {
      method: 'PATCH',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      credentials: 'include',
      body: JSON.stringify({ status }),
    });
    loadTickets();
  };

  useEffect(() => {
    if (activeTab === 'faqs') loadFaqs();
    else if (activeTab === 'logs') {
      loadLogs();
      loadVoiceSessions();
    }
    else if (activeTab === 'tickets') loadTickets();
  }, [activeTab, loadFaqs, loadLogs, loadTickets, loadVoiceSessions]);

  useEffect(() => {
    if (activeTab !== 'logs') return;
    if (!selectedSessionId) {
      setSessionMessages([]);
      return;
    }
    loadSessionMessages(selectedSessionId);
  }, [activeTab, selectedSessionId, loadSessionMessages]);

  return (
    <div className="bg-[#f3f3f3] min-h-screen pb-20">
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center gap-4 mb-6">
          <Link to="/">
            <Button variant="ghost" size="icon" className="h-10 w-10 hover:bg-white rounded-full">
              <ArrowLeft className="h-6 w-6" />
            </Button>
          </Link>
          <h1 className="text-xl font-bold text-gray-900 uppercase">Trang Quản Trị</h1>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{user?.name || user?.email || 'Admin'}</p>
              <p className="text-sm text-gray-500">{new Date().toLocaleDateString('vi-VN')}</p>
            </div>
            <div className="flex gap-2 text-sm">
              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full">FAQ: {faqs.length}</span>
              <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full">Logs: {logs.length}</span>
              <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full">Tickets: {tickets.length}</span>
            </div>
          </div>
        </div>

        <div className="flex gap-1 mb-4">
          {[
            { key: 'faqs', label: 'FAQ' },
            { key: 'logs', label: 'Nhật ký giọng nói' },
            { key: 'tickets', label: 'Phiếu hỗ trợ' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as Tab)}
              className={`px-5 py-2.5 rounded-t-lg text-sm font-medium transition-all ${
                activeTab === tab.key
                  ? 'bg-white text-black border-t border-x border-gray-200'
                  : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-b-lg rounded-tr-lg border border-gray-200 p-6">
          {activeTab === 'faqs' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold">Quản lý FAQ</h2>
                <Button
                  onClick={() => {
                    setShowFaqForm(true);
                    setEditingFaq(null);
                    setFaqError(null);
                  }}
                  className="bg-primary text-black hover:bg-primary/90"
                >
                  + Thêm FAQ
                </Button>
              </div>

              {(showFaqForm || editingFaq) && (
                <div className="mb-6 bg-gray-50 border border-gray-200 rounded-xl p-5">
                  <h3 className="font-medium mb-4">
                    {editingFaq ? 'Chỉnh sửa FAQ' : 'Thêm FAQ mới'}
                  </h3>
                  {faqError && (
                    <div className="mb-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                      {faqError}
                    </div>
                  )}
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Câu hỏi *</label>
                      <input
                        className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-black"
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
                      <label className="text-xs text-gray-500 mb-1 block">Câu trả lời *</label>
                      <textarea
                        rows={3}
                        className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-black resize-none"
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
                      <label className="text-xs text-gray-500 mb-1 block">Danh mục</label>
                      <select
                        className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-black"
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
                      <Button onClick={saveFaq} className="bg-green-600 hover:bg-green-700 text-white text-sm">
                        Lưu
                      </Button>
                      <Button
                        onClick={() => {
                          setEditingFaq(null);
                          setShowFaqForm(false);
                          setFaqError(null);
                        }}
                        variant="outline"
                        className="text-sm"
                      >
                        Hủy
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {faqLoading ? (
                <div className="text-center py-12 text-gray-500">Đang tải...</div>
              ) : faqs.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  Chưa có FAQ nào. Nhấn "Thêm FAQ" để bắt đầu.
                </div>
              ) : (
                <div className="space-y-3">
                  {faqs.map((faq) => (
                    <div
                      key={faq.id}
                      className="bg-gray-50 border border-gray-200 rounded-xl p-4 hover:border-gray-300 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                              {faq.category}
                            </span>
                            <span className="text-xs text-gray-500">
                              {new Date(faq.created_at).toLocaleDateString('vi-VN')}
                            </span>
                          </div>
                          <p className="font-medium text-sm mb-1">{faq.question}</p>
                          <p className="text-sm text-gray-600 leading-relaxed">{faq.answer}</p>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <button
                            onClick={() => {
                              setEditingFaq(faq);
                              setShowFaqForm(false);
                              setFaqError(null);
                            }}
                            className="text-xs px-2.5 py-1 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-800 transition-colors"
                          >
                            Sửa
                          </button>
                          <button
                            onClick={() => deleteFaq(faq.id)}
                            className="text-xs px-2.5 py-1 rounded-lg bg-red-100 hover:bg-red-200 text-red-800 transition-colors"
                          >
                            Xóa
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'logs' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold">Nhật ký tương tác giọng nói</h2>
                <button
                  onClick={() => {
                    loadLogs();
                    loadVoiceSessions();
                    if (selectedSessionId) loadSessionMessages(selectedSessionId);
                  }}
                  className="text-sm px-3 py-1.5 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700 transition-colors"
                >
                  Làm mới
                </button>
              </div>

              {logsLoading ? (
                <div className="text-center py-12 text-gray-500">Đang tải...</div>
              ) : logs.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  Chưa có nhật ký nào.
                </div>
              ) : (
                <div className="space-y-3 mb-8">
                  {logs.map((log) => (
                    <div
                      key={log.id}
                      className="bg-gray-50 border border-gray-200 rounded-xl p-4 hover:border-gray-300 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2">
                          {log.intent && (
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full font-mono ${INTENT_COLORS[log.intent] || 'bg-gray-200 text-gray-700'}`}
                            >
                              {log.intent}
                            </span>
                          )}
                          <span className="text-xs text-gray-500">
                            {log.session_id?.slice(0, 8)} ·{' '}
                            {new Date(log.created_at).toLocaleString('vi-VN')}
                          </span>
                        </div>
                        {log.user_id && (
                          <span className="text-xs text-gray-500">
                            {log.user_id.slice(0, 8)}
                          </span>
                        )}
                      </div>
                      <div className="space-y-1.5">
                        <div>
                          <p className="text-xs text-gray-500 mb-0.5">Người dùng:</p>
                          <p className="text-sm text-gray-800">{log.user_text}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-0.5">AI:</p>
                          <p className="text-sm text-gray-600">{log.response_text}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-8 border-t border-gray-200 pt-6">
                <h3 className="text-base font-semibold mb-3">Phiên hội thoại giọng nói theo người dùng</h3>
                {sessions.length === 0 ? (
                  <div className="text-sm text-gray-500">Chưa có phiên hội thoại nào.</div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
                      {sessions.map((session) => (
                        <button
                          key={session.id}
                          type="button"
                          onClick={() => setSelectedSessionId(session.id)}
                          className={`w-full text-left border rounded-xl p-3 transition-colors ${
                            selectedSessionId === session.id
                              ? 'border-blue-400 bg-blue-50'
                              : 'border-gray-200 bg-white hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-mono text-xs text-gray-700">{session.id.slice(0, 12)}</span>
                            <span className="text-xs text-gray-500">{session.message_count} tin</span>
                          </div>
                          <div className="text-xs text-gray-500 mb-1">
                            user: {session.user_id ? session.user_id.slice(0, 12) : 'guest'}
                          </div>
                          {session.last_intent && (
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${INTENT_COLORS[session.last_intent] || 'bg-gray-200 text-gray-700'}`}>
                              {session.last_intent}
                            </span>
                          )}
                          <p className="text-xs text-gray-600 mt-2 line-clamp-2">{session.last_user_text || 'Không có nội dung user'}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(session.updated_at).toLocaleString('vi-VN')}
                          </p>
                        </button>
                      ))}
                    </div>

                    <div className="border border-gray-200 rounded-xl p-4 bg-gray-50 min-h-[280px]">
                      {!selectedSessionId ? (
                        <div className="text-sm text-gray-500">Chọn một phiên bên trái để xem toàn bộ hội thoại.</div>
                      ) : sessionMessagesLoading ? (
                        <div className="text-sm text-gray-500">Đang tải hội thoại...</div>
                      ) : sessionMessages.length === 0 ? (
                        <div className="text-sm text-gray-500">Phiên này chưa có tin nhắn.</div>
                      ) : (
                        <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
                          {sessionMessages.map((message) => (
                            <div
                              key={message.id}
                              className={`rounded-lg px-3 py-2 border text-sm ${
                                message.role === 'user'
                                  ? 'bg-blue-50 border-blue-200 text-blue-900'
                                  : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-[10px] uppercase tracking-wide font-semibold">{message.role}</span>
                                <span className="text-[10px] opacity-70">{new Date(message.created_at).toLocaleTimeString('vi-VN')}</span>
                              </div>
                              <div>{message.text}</div>
                              {message.intent && (
                                <div className="text-[10px] mt-1 opacity-80">intent: {message.intent}</div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'tickets' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold">Phiếu hỗ trợ khách hàng</h2>
                <button
                  onClick={loadTickets}
                  className="text-sm px-3 py-1.5 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700 transition-colors"
                >
                  Làm mới
                </button>
              </div>

              {ticketsLoading ? (
                <div className="text-center py-12 text-gray-500">Đang tải...</div>
              ) : tickets.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  Chưa có phiếu hỗ trợ nào.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-gray-500 border-b border-gray-200">
                        <th className="pb-3 pr-4">Mã</th>
                        <th className="pb-3 pr-4">Người dùng</th>
                        <th className="pb-3 pr-4">Danh mục</th>
                        <th className="pb-3 pr-4 max-w-xs">Nội dung</th>
                        <th className="pb-3 pr-4">Trạng thái</th>
                        <th className="pb-3 pr-4">Ngày tạo</th>
                        <th className="pb-3">Hành động</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {tickets.map((ticket) => (
                        <tr key={ticket.id} className="hover:bg-gray-50 transition-colors">
                          <td className="py-3 pr-4">
                            <span className="font-mono text-xs text-gray-600">
                              #{ticket.short_id}
                            </span>
                          </td>
                          <td className="py-3 pr-4 text-gray-600 text-xs">
                            {ticket.user_id ? ticket.user_id.slice(0, 8) : 'Khách'}
                          </td>
                          <td className="py-3 pr-4">
                            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                              {ticket.category_label}
                            </span>
                          </td>
                          <td className="py-3 pr-4 max-w-xs">
                            <p className="text-gray-600 text-xs truncate">{ticket.message}</p>
                          </td>
                          <td className="py-3 pr-4">
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[ticket.status] || 'bg-gray-100 text-gray-700'}`}
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
                          <td className="py-3 pr-4 text-xs text-gray-500">
                            {new Date(ticket.created_at).toLocaleDateString('vi-VN')}
                          </td>
                          <td className="py-3">
                            <select
                              value={ticket.status}
                              onChange={(e) => updateTicketStatus(ticket.id, e.target.value)}
                              className="text-xs bg-white border border-gray-300 rounded-lg px-2 py-1 text-gray-700 focus:outline-none focus:border-black"
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
    </div>
  );
}

export const Route = createFileRoute('/admin')({
  component: AdminPage,
});
