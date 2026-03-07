import { useState, useRef, useCallback, useEffect } from 'react';
import { Mic, Loader2, Square } from 'lucide-react';
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
  const cartItems = useCartStore((s) => s.items);
  const user = useAuthStore((s) => s.user);
  const feedbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showFeedback = useCallback((text: string, duration = 5000) => {
    if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    setFeedback(text);
    feedbackTimeoutRef.current = setTimeout(() => setFeedback(null), duration);
  }, []);

  // Session storage key for product context
  const LAST_PRODUCTS_KEY = 'voice_last_products';
  const CONVERSATION_HISTORY_KEY = 'voice_conversation_history';
  const MAX_HISTORY_LENGTH = 6;
  const [lastProducts, setLastProducts] = useState<
    Array<{ id: string; name: string; price: number; index: number }>
  >(() => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = sessionStorage.getItem(LAST_PRODUCTS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

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
              last_products: lastProducts,
              conversation_history: conversationHistory.slice(-MAX_HISTORY_LENGTH),
            },
          }),
        });

        if (!response.ok) throw new Error('Voice processing failed');

        const data = await response.json();

        if (data.transcribed_text) {
          showFeedback(`🗣️ Bạn: ${data.transcribed_text}`, 5000);
        }

        // Handle specific actions returned by the backend (Cart/Navigation)
        if (data.action?.type === 'checkout') {
          navigate({ to: '/checkout' });
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
                  interface ProductResult {
                    id: string;
                    name: string;
                    price: number;
                  }
                  const productsWithIndex = (parsed.results as ProductResult[]).map((p, idx) => ({
                    id: p.id,
                    name: p.name,
                    price: p.price,
                    index: idx + 1,
                  }));
                  setLastProducts(productsWithIndex);
                  sessionStorage.setItem(LAST_PRODUCTS_KEY, JSON.stringify(productsWithIndex));
                }
              } catch (e) {
                console.error('Failed to parse tool results:', e);
              }
              break;
            }
          }
        }

        if (data.response_text) {
          const utterance = new SpeechSynthesisUtterance(data.response_text);
          utterance.lang = 'vi-VN';
          utterance.rate = 1.0;
          utterance.pitch = 1.0;
          const voices = window.speechSynthesis.getVoices();
          const vietnameseVoice = voices.find(
            (v) => v.lang.includes('vi') || v.lang.includes('VN'),
          );
          if (vietnameseVoice) {
            utterance.voice = vietnameseVoice;
          }
          window.speechSynthesis.speak(utterance);
        }

        if (data.response_text && !data.audio_base64) {
          showFeedback(`💬 ${data.response_text}`, 10000);
        }

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

  const toggleRecording = () => {
    if (state === 'idle') {
      startRecording();
    } else if (state === 'recording') {
      stopRecording();
    }
  };

  return (
    <div className="fixed bottom-20 right-6 z-[60] flex flex-col items-end gap-4 pointer-events-none">
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
