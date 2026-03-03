import { useState, useRef, useCallback, useEffect } from 'react';
import { Mic, Loader2, Square } from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';
import { useCartStore } from '../store/cart';
import { useAuthStore } from '../store/auth';
import { cn } from '../lib/utils';
import { Button } from './ui/button';
import { API_BASE } from '../lib/api';

const AudioVisualizerComponent = ({ audioContextRef, isRecording }: { audioContextRef: React.MutableRefObject<AudioContext | null>, isRecording: boolean }) => {
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

const convertToWav = async (audioBlob: Blob): Promise<string> => {
  const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const audioContext = new AudioContextClass({ sampleRate: 16000 });
  const arrayBuffer = await audioBlob.arrayBuffer();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  
  const pcmData = audioBuffer.getChannelData(0); 
  const wavBuffer = new ArrayBuffer(44 + pcmData.length * 2);
  const view = new DataView(wavBuffer);
  
  const writeString = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) view.setUint8(offset + i, string.charCodeAt(i));
  };
  
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + pcmData.length * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // Mono
  view.setUint32(24, 16000, true); // Sample Rate
  view.setUint32(28, 16000 * 2, true); // Byte Rate
  view.setUint16(32, 2, true); // Block Align
  view.setUint16(34, 16, true); // Bits per Sample
  writeString(36, 'data');
  view.setUint32(40, pcmData.length * 2, true);
  
  let offset = 44;
  for (let i = 0; i < pcmData.length; i++) {
    const s = Math.max(-1, Math.min(1, pcmData[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    offset += 2;
  }
  
  const wavBlob = new Blob([view], { type: 'audio/wav' });
  
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = (reader.result as string).split(',')[1];
      resolve(base64);
    };
    reader.readAsDataURL(wavBlob);
  });
};

type AssistantState = 'idle' | 'recording' | 'processing';

interface VoiceAction {
  type: 'search' | 'add_to_cart' | 'remove_from_cart' | 'checkout' | 'list_products' | 'compare' | 'create_ticket' | 'order_status' | 'filter' | 'chat';
  query?: string | null;
  selection?: string | null;
  payload?: {
    results?: Array<{
      id: string;
      name: string;
      price: number;
      brand?: string;
      category?: string;
      images?: string[];
    }>;
    product?: {
      id: string;
      name: string;
      price: number;
      brand?: string;
      category?: string;
      images?: string[];
    };
  };
}

interface VoiceResponse {
  intent?: string;
  action?: VoiceAction;
  response_text?: string;
  transcribed_text?: string;
  // audio returned as base64 by the Worker / Java backend
  audio_base64?: string | null;
  error?: string;
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
  const cartItems = useCartStore((s) => s.items);
  const user = useAuthStore((s) => s.user);
  const lastProductsRef = useRef<Array<any>>([]);
  const feedbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showFeedback = useCallback((text: string, duration = 5000) => {
    if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    setFeedback(text);
    feedbackTimeoutRef.current = setTimeout(() => setFeedback(null), duration);
  }, []);

  const handleAction = useCallback((data: VoiceResponse) => {
    const { action, response_text } = data;

    if (response_text) {
      showFeedback(response_text, 15000); // Longer duration for product lists
    }

    if (!action) return;

    switch (action.type) {
      case 'search':
      case 'list_products':
      case 'filter':
        if (action.payload?.results && action.payload.results.length > 0) {
          // Store results for selection - user can say "chọn cái đầu tiên"
          lastProductsRef.current = action.payload.results;
          // Show product list in feedback
          const listText = action.payload.results.map((p, i) => 
            `${i+1}. ${p.name} - ${p.price?.toLocaleString('vi-VN')} VND`
          ).join('\n');
          showFeedback(`${response_text}\n\n${listText}`, 20000);
        } else if (action.query) {
          navigate({ to: '/products', search: { search: action.query } as any });
        }
        break;
      case 'add_to_cart':
        if (!user) {
          showFeedback('Xin vui lòng đăng nhập để thêm vào giỏ hàng.');
          navigate({ to: '/login', search: { redirect: window.location.pathname } as any });
          break;
        }

        if (action.payload?.product) {
          // Worker found the product (via Vectorize or context) — add directly
          addToCart(action.payload.product as import('../types/product').Product);
          showFeedback(`✅ Đã thêm ${action.payload.product.name} vào giỏ hàng!`);
        } else if (action.selection && !action.query && lastProductsRef.current.length > 0) {
          // User selected by position (e.g. "cái đầu tiên") but Worker had no context —
          // use our locally-cached product list
          const selIdx = parseInt(action.selection, 10) - 1;
          const product = lastProductsRef.current[Math.min(Math.max(selIdx, 0), lastProductsRef.current.length - 1)];
          addToCart(product as import('../types/product').Product);
          showFeedback(`✅ Đã thêm ${product.name} vào giỏ hàng!`);
        } else if (action.query) {
          // Worker couldn't find by name — search the backend from the browser (accessible)
          fetch(`${API_BASE}/api/products?search=${encodeURIComponent(action.query)}`)
            .then(res => res.json())
            .then((products: any[]) => {
              if (products && products.length > 0) {
                const product = products[0];
                addToCart(product as import('../types/product').Product);
                showFeedback(`✅ Đã thêm ${product.name} vào giỏ hàng!`);
              } else {
                showFeedback('❌ Không tìm thấy sản phẩm phù hợp.');
              }
            })
            .catch(() => showFeedback('❌ Không thể tìm sản phẩm. Vui lòng thử lại.'));
        }
        break;

      case 'remove_from_cart':
        if (cartItems.length > 0) {
          const lastItem = cartItems[cartItems.length - 1];
          removeFromCart(lastItem.id);
          showFeedback(`🗑️ Đã xóa ${lastItem.name} khỏi giỏ hàng.`);
        } else {
          showFeedback('Giỏ hàng đang trống.');
        }
        break;
      case 'compare':
        if (action.payload?.results && action.payload.results.length >= 2) {
          lastProductsRef.current = action.payload.results;
          const compareText = action.payload.results.map((p, i) => 
            `${i+1}. ${p.name} - ${p.price?.toLocaleString('vi-VN')} VND`
          ).join('\n');
          showFeedback(`📊 So sánh:\n${compareText}`, 20000);
        } else if (action.query) {
          navigate({ to: '/products', search: { search: action.query } as any });
        }
        break;
      case 'checkout':
        navigate({ to: '/checkout' });
        break;
      case 'order_status':
        // No /orders route exists — the feedback message from the Worker suffices
        break;
      case 'create_ticket':
        showFeedback('🎫 Đã ghi nhận! Nhân viên CSKH sẽ liên hệ bạn trong 24 giờ qua SĐT hoặc email đã đăng ký.');
        break;
      case 'chat':
      default:
        // response_text already shown above
        break;
    }
  }, [navigate, addToCart, removeFromCart, cartItems, showFeedback, user]);

  const processAudio = async (blob: Blob) => {
    setState('processing');
    try {
      const base64 = await convertToWav(blob);
      // Build context with last listed products so the Worker can use them for selection
      const voiceContext: Record<string, any> = {};
      if (lastProductsRef.current.length > 0) {
        voiceContext.last_products = lastProductsRef.current;
      }
      const response = await fetch(`${API_BASE}/api/voice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          audio_base64: base64,
          context: voiceContext
        })
      });

      if (!response.ok) throw new Error('Voice API failed');

      const data: VoiceResponse = await response.json();

      // Play TTS audio if the backend returned one
      if (data.audio_base64) {
        try {
          const audio = new Audio(`data:audio/wav;base64,${data.audio_base64}`);
          await audio.play();
        } catch (e) {
          console.warn('Audio playback failed:', e);
        }
      } else if (data.response_text) {
        // Fallback to browser's native TTS
        try {
          const text = data.response_text;
          // Simple regex to detect if the response contains Vietnamese characters
          const isVietnamese = /[àáãạảăắằẳẵặâấầẩẫậèéẹẻẽêềếểễệđìíĩỉịòóõọỏôốồổỗộơớờởỡợùúũụủưứừửữựỳýỹỷỵ]/i.test(text);

          const utterance = new SpeechSynthesisUtterance(text);
          utterance.lang = isVietnamese ? 'vi-VN' : 'en-US';
          utterance.rate = 1.0;
          
          // Try to find a matching voice
          const voices = window.speechSynthesis.getVoices();
          const targetVoice = voices.find(v => 
            v.lang.toLowerCase().includes(isVietnamese ? 'vi' : 'en')
          );
          if (targetVoice) utterance.voice = targetVoice;

          window.speechSynthesis.speak(utterance);
        } catch (e) {
          console.warn('Native TTS failed:', e);
        }
      }

      handleAction(data);
    } catch (error) {
      console.error('Error processing voice:', error);
      showFeedback('Xin lỗi, tôi không thể xử lý yêu cầu lúc này.');
    } finally {
      setState('idle');
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Set up Web Audio API for visualization
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
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
        stream.getTracks().forEach(t => t.stop());
        
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
        <div className={cn(
          "max-w-[280px] bg-white text-gray-800 p-4 rounded-2xl shadow-2xl border border-gray-100",
          "animate-in fade-in slide-in-from-bottom-2 duration-300 pointer-events-auto",
          "text-sm font-medium leading-relaxed"
        )}>
          {feedback}
        </div>
      )}

      {state === 'recording' && (
        <div className="pointer-events-auto">
          <AudioVisualizerComponent audioContextRef={audioContextRef} isRecording={state === 'recording'} />
        </div>
      )}

      <div className="relative pointer-events-auto">
        {state === 'recording' && (
          <div className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-25 scale-150" />
        )}
        
        <Button
          size="icon"
          className={cn(
            "w-16 h-16 rounded-full shadow-2xl transition-all duration-300 scale-100 hover:scale-110 active:scale-95",
            state === 'idle' && "bg-yellow-400 hover:bg-yellow-500 text-black",
            state === 'recording' && "bg-red-500 hover:bg-red-600 text-white",
            state === 'processing' && "bg-blue-500 hover:bg-blue-600 text-white"
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
