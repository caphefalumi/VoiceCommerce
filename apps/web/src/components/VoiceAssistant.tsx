import { useState, useRef, useCallback, useEffect } from 'react';
import { Mic, Loader2, Square, MessageSquare, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';
import { useCartStore } from '../store/cart';
import { useAuthStore } from '../store/auth';
import { cn } from '../lib/utils';
import { Button } from './ui/button';
import { AI_BASE } from '../lib/api';

const AudioVisualizerComponent = ({
  audioContextRef,
  isRecording,
}: {
  audioContextRef: React.MutableRefObject<AudioContext | null>;
  isRecording: boolean;
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isRecording || !canvasRef.current) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      return;
    }

    const canvas = canvasRef.current;
    const canvasContext = canvas.getContext('2d');
    if (!canvasContext) return;

    // Get or create analyser node
    if (!analyserRef.current && audioContextRef.current) {
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
    }

    if (!analyserRef.current) return;

    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animationFrameRef.current = requestAnimationFrame(draw);

      analyser.getByteFrequencyData(dataArray);

      // Clear canvas with gradient background
      canvasContext.fillStyle = 'rgba(31, 41, 55, 0.8)';
      canvasContext.fillRect(0, 0, canvas.width, canvas.height);

      // Draw bars
      const barWidth = (canvas.width / bufferLength) * 2.5;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height;

        // Gradient color based on frequency
        const hue = (i / bufferLength) * 360;
        canvasContext.fillStyle = `hsl(${hue}, 100%, 50%)`;

        canvasContext.fillRect(x, canvas.height - barHeight, barWidth, barHeight);

        x += barWidth + 1;
      }
    };

    draw();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isRecording, audioContextRef]);

  return (
    <canvas
      ref={canvasRef}
      width={200}
      height={100}
      className="rounded-lg bg-gray-800 border border-gray-700"
    />
  );
};

type AssistantState = 'idle' | 'recording' | 'processing';

type DebugChatMessage = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  text: string;
  timestamp: number;
  actionType?: string;
  toolNames?: string[];
};

const DEBUG_CHAT_HISTORY_KEY = 'voice_debug_chat_history';
const MAX_DEBUG_CHAT_ITEMS = 30;

function formatToolNames(toolResults: unknown): string[] {
  if (!Array.isArray(toolResults)) return [];
  return toolResults
    .map((tr) => {
      if (typeof tr === 'object' && tr !== null && 'toolName' in tr) {
        const candidate = (tr as { toolName?: unknown }).toolName;
        return typeof candidate === 'string' ? candidate : null;
      }
      return null;
    })
    .filter((v): v is string => Boolean(v));
}

export function VoiceAssistant() {
  const [state, setState] = useState<AssistantState>('idle');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [sessionId] = useState(() => {
    const saved = localStorage.getItem('voice_session_id');
    if (saved) return saved;
    const id = Math.random().toString(36).substring(2, 15);
    localStorage.setItem('voice_session_id', id);
    return id;
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const navigate = useNavigate();
  const addToCart = useCartStore((s) => s.addToCart);
  const removeFromCart = useCartStore((s) => s.removeFromCart);
  const clearCart = useCartStore((s) => s.clearCart);
  const cartItems = useCartStore((s) => s.items);
  const user = useAuthStore((s) => s.user);
  const feedbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);

  const decodeBase64AudioToDataUrl = useCallback((audioBase64: string) => {
    if (audioBase64.startsWith('data:audio/')) {
      return audioBase64;
    }

    // Fallback to mp3 container when backend doesn't include a data URL prefix.
    return `data:audio/mpeg;base64,${audioBase64}`;
  }, []);

  const getVietnameseVoice = useCallback(async (): Promise<SpeechSynthesisVoice | null> => {
    const pickVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      if (!voices.length) return null;

      return (
        voices.find((voice) => voice.lang.toLowerCase() === 'vi-vn') ||
        voices.find((voice) => voice.lang.toLowerCase().startsWith('vi')) ||
        null
      );
    };

    const immediate = pickVoice();
    if (immediate) return immediate;

    return await new Promise((resolve) => {
      const timeoutId = window.setTimeout(() => {
        window.speechSynthesis.onvoiceschanged = null;
        resolve(pickVoice());
      }, 1200);

      window.speechSynthesis.onvoiceschanged = () => {
        window.clearTimeout(timeoutId);
        window.speechSynthesis.onvoiceschanged = null;
        resolve(pickVoice());
      };

      window.speechSynthesis.getVoices();
    });
  }, []);

  const speakVietnamese = useCallback(
    async (text: string) => {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'vi-VN';
      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      const vietnameseVoice = await getVietnameseVoice();
      if (vietnameseVoice) {
        utterance.voice = vietnameseVoice;
      }

      window.speechSynthesis.speak(utterance);
    },
    [getVietnameseVoice],
  );

  const showFeedback = useCallback((text: string, duration = 5000) => {
    if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    setFeedback(text);
    feedbackTimeoutRef.current = setTimeout(() => setFeedback(null), duration);
  }, []);

  // Session storage key for conversation history
  const CONVERSATION_HISTORY_KEY = 'voice_conversation_history';
  const LAST_SEARCH_RESULTS_KEY = 'voice_last_search_results';
  const MAX_HISTORY_LENGTH = 6;
  const [conversationHistory, setConversationHistory] = useState<
    Array<{ role: 'user' | 'assistant'; content: string }>
  >(() => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = sessionStorage.getItem(CONVERSATION_HISTORY_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [lastSearchResults, setLastSearchResults] = useState<
    Array<{ id: string; name: string; price: number; index: number }>
  >(() => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = sessionStorage.getItem(LAST_SEARCH_RESULTS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [debugChatOpen, setDebugChatOpen] = useState(false);
  const [debugMessages, setDebugMessages] = useState<DebugChatMessage[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = sessionStorage.getItem(DEBUG_CHAT_HISTORY_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const appendDebugMessages = useCallback((messages: Omit<DebugChatMessage, 'id' | 'timestamp'>[]) => {
    if (!messages.length) return;
    setDebugMessages((prev) => {
      const now = Date.now();
      const mapped = messages.map((msg, idx) => ({
        ...msg,
        id: `${now}-${idx}-${Math.random().toString(36).slice(2, 8)}`,
        timestamp: now + idx,
      }));
      const next = [...prev, ...mapped].slice(-MAX_DEBUG_CHAT_ITEMS);
      sessionStorage.setItem(DEBUG_CHAT_HISTORY_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const clearDebugMessages = useCallback(() => {
    setDebugMessages([]);
    sessionStorage.removeItem(DEBUG_CHAT_HISTORY_KEY);
  }, []);

  useEffect(() => {
    window.speechSynthesis.getVoices();
    window.speechSynthesis.onvoiceschanged = () => {
      window.speechSynthesis.getVoices();
    };
  }, []);

  // Send audio blob as base64 to /voice-process
  const processAudio = async (blob: Blob) => {
    setState('processing');
    try {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = async () => {
        const base64Audio = (reader.result as string).split(',')[1];

        const response = await fetch(`${AI_BASE}/voice-process`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            audio_base64: base64Audio,
            session_id: sessionId,
            context: {
              user_id: user?.id,
              conversation_history: conversationHistory.slice(-MAX_HISTORY_LENGTH),
              last_search_results: lastSearchResults,
            },
          }),
        });

        if (!response.ok) throw new Error('Voice processing failed');

        const data = await response.json();

        const toolNames = formatToolNames(data.tool_results);
        const actionType = data.action?.type as string | undefined;
        const pendingDebugMessages: Omit<DebugChatMessage, 'id' | 'timestamp'>[] = [];

        if (data.transcribed_text) {
          showFeedback(`🗣️ Bạn: ${data.transcribed_text}`, 5000);
          pendingDebugMessages.push({ role: 'user', text: data.transcribed_text });
        }

        // Handle specific actions returned by the backend (Cart/Navigation)
        if (data.action?.type === 'checkout_start' || data.action?.type === 'checkout') {
          showFeedback('🛒 Đang chuyển bạn đến trang thanh toán...');
          setTimeout(() => navigate({ to: '/checkout' }), 1000);
        } else if (data.action?.type === 'checkout_complete') {
          clearCart();
          showFeedback('✅ Đặt hàng thành công! Bạn có thể theo dõi đơn trong trang đơn hàng của tôi.');
          setTimeout(() => navigate({ to: '/orders' }), 1000);
        } else if (data.action?.type === 'search' && data.action.query) {
          navigate({ to: '/products', search: { search: data.action.query } });
        } else if (data.action?.type === 'add_to_cart' && data.action.payload?.product) {
          const p = data.action.payload.product;
          for (let i = 0; i < (data.action.payload.quantity || 1); i++) {
            addToCart(p, true);
          }
        } else if (data.action?.type === 'remove_from_cart') {
          const removeId = data.action.payload?.productId;
          if (removeId) {
            removeFromCart(removeId, true);
          } else {
            const itemToRemove = cartItems[cartItems.length - 1];
            if (itemToRemove) removeFromCart(itemToRemove.id, true);
          }
        }

        // Store search results in sessionStorage for context
        if (data.tool_results) {
          for (const tr of data.tool_results) {
            if (tr.toolName === 'searchProducts' || tr.toolName === 'filterProductsByPrice') {
              try {
                let parsed: any;
                if (tr.output?.content?.[0]?.text) {
                  parsed = JSON.parse(tr.output.content[0].text);
                } else {
                  parsed = typeof tr.result === 'string' ? JSON.parse(tr.result) : tr.result;
                }
                
                if (parsed?.results && Array.isArray(parsed.results)) {
                  const productsWithIndex = parsed.results.map((p: any, idx: number) => ({
                    id: p.id,
                    name: p.name,
                    price: p.price,
                    index: idx + 1,
                  }));
                  setLastSearchResults(productsWithIndex);
                  sessionStorage.setItem(LAST_SEARCH_RESULTS_KEY, JSON.stringify(productsWithIndex));
                }
              } catch (e) {
                console.error('Failed to parse tool results:', e);
              }
              break;
            }
          }
        }

        if (data.audio_base64) {
          try {
            const dataUrl = decodeBase64AudioToDataUrl(data.audio_base64);
            if (activeAudioRef.current) {
              activeAudioRef.current.pause();
              activeAudioRef.current = null;
            }

            const audio = new Audio(dataUrl);
            activeAudioRef.current = audio;
            await audio.play();
          } catch {
            if (data.response_text) {
              await speakVietnamese(data.response_text);
            }
          }
        } else if (data.response_text) {
          await speakVietnamese(data.response_text);
        }

        if (data.response_text && !data.audio_base64) {
          showFeedback(`💬 ${data.response_text}`, 10000);
        }

        if (data.response_text) {
          pendingDebugMessages.push({
            role: 'assistant',
            text: data.response_text,
            actionType,
            toolNames,
          });
        }

        if (actionType || toolNames.length > 0) {
          pendingDebugMessages.push({
            role: 'system',
            text: [
              actionType ? `Action: ${actionType}` : null,
              toolNames.length > 0 ? `Tools: ${toolNames.join(', ')}` : null,
            ]
              .filter(Boolean)
              .join(' | '),
            actionType,
            toolNames,
          });
        }

        appendDebugMessages(pendingDebugMessages);

        if (data.transcribed_text || data.response_text) {
          const newHistory = [...conversationHistory];
          if (data.transcribed_text) {
            newHistory.push({ role: 'user', content: data.transcribed_text });
          }
          if (data.response_text) {
            newHistory.push({ role: 'assistant', content: data.response_text });
          }
          const trimmedHistory = newHistory.slice(-MAX_HISTORY_LENGTH);
          setConversationHistory(trimmedHistory);
          sessionStorage.setItem(CONVERSATION_HISTORY_KEY, JSON.stringify(trimmedHistory));
        }

        setState('idle');
      };
    } catch (error) {
      console.error('Error processing voice:', error);
      showFeedback('Xin lỗi, tôi không thể xử lý yêu cầu lúc này.');
      setState('idle');
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Set up Web Audio API for visualization
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const audioContext = new AudioContextClass();
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyserRef.current = analyser;

      source.connect(analyser);

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        processAudio(blob);
        stream.getTracks().forEach((t) => t.stop());

        // Clean up audio context
        if (audioContextRef.current) {
          audioContextRef.current.close();
          audioContextRef.current = null;
        }
      };

      recorder.start();
      setState('recording');
      showFeedback('Đang nghe...');
    } catch (err) {
      console.error('Mic access denied:', err);
      showFeedback('Không thể truy cập micro.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  };

  useEffect(() => {
    return () => {
      if (activeAudioRef.current) {
        activeAudioRef.current.pause();
        activeAudioRef.current = null;
      }
      window.speechSynthesis.cancel();
    };
  }, []);

  const toggleRecording = () => {
    if (state === 'idle') {
      startRecording();
    } else if (state === 'recording') {
      stopRecording();
    }
  };

  return (
    <div className="fixed bottom-20 right-6 z-[60] flex flex-col items-end gap-4 pointer-events-none">
      <div className="pointer-events-auto w-[360px] max-w-[calc(100vw-2rem)]">
        <div className="rounded-2xl border border-gray-200 bg-white shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-200">
            <button
              type="button"
              onClick={() => setDebugChatOpen((v) => !v)}
              className="inline-flex items-center gap-2 text-sm font-semibold text-gray-800"
            >
              <MessageSquare className="w-4 h-4" />
              Voice Debug Chat
              {debugChatOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={clearDebugMessages}
              disabled={debugMessages.length === 0}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>

          {debugChatOpen && (
            <div className="max-h-80 overflow-y-auto p-3 space-y-2 bg-white">
              {debugMessages.length === 0 ? (
                <div className="text-xs text-gray-500">No debug messages yet. Start speaking to populate logs.</div>
              ) : (
                debugMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn(
                      'rounded-xl px-3 py-2 text-xs leading-relaxed border',
                      msg.role === 'user' && 'bg-blue-50 border-blue-200 text-blue-900',
                      msg.role === 'assistant' && 'bg-emerald-50 border-emerald-200 text-emerald-900',
                      msg.role === 'system' && 'bg-amber-50 border-amber-200 text-amber-900',
                    )}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-semibold uppercase tracking-wide">{msg.role}</span>
                      <span className="text-[10px] opacity-70">{new Date(msg.timestamp).toLocaleTimeString('vi-VN')}</span>
                    </div>
                    <div>{msg.text}</div>
                    {(msg.actionType || (msg.toolNames && msg.toolNames.length > 0)) && (
                      <div className="mt-1 text-[10px] opacity-80">
                        {msg.actionType ? `action=${msg.actionType}` : ''}
                        {msg.actionType && msg.toolNames && msg.toolNames.length > 0 ? ' · ' : ''}
                        {msg.toolNames && msg.toolNames.length > 0 ? `tools=${msg.toolNames.join(',')}` : ''}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {feedback && (
        <div
          className={cn(
            'max-w-[280px] bg-white text-gray-800 p-4 rounded-2xl shadow-2xl border border-gray-100',
            'animate-in fade-in slide-in-from-bottom-2 duration-300 pointer-events-auto',
            'text-sm font-medium leading-relaxed',
          )}
        >
          {feedback}
        </div>
      )}

      {state === 'recording' && (
        <div className="pointer-events-auto">
          <AudioVisualizerComponent
            audioContextRef={audioContextRef}
            isRecording={state === 'recording'}
          />
        </div>
      )}

      <div className="relative pointer-events-auto">
        {state === 'recording' && (
          <div className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-25 scale-150" />
        )}

        <Button
          size="icon"
          className={cn(
            'w-16 h-16 rounded-full shadow-2xl transition-all duration-300 scale-100 hover:scale-110 active:scale-95',
            state === 'idle' && 'bg-yellow-400 hover:bg-yellow-500 text-black',
            state === 'recording' && 'bg-red-500 hover:bg-red-600 text-white',
            state === 'processing' && 'bg-blue-500 hover:bg-blue-600 text-white',
          )}
          onClick={toggleRecording}
          disabled={state === 'processing'}
        >
          {state === 'idle' && <Mic className="w-8 h-8" />}
          {state === 'recording' && <Square className="w-6 h-6 fill-current" />}
          {state === 'processing' && <Loader2 className="w-8 h-8 animate-spin" />}
        </Button>
      </div>
    </div>
  );
}
