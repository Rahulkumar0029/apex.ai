import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { io, Socket } from 'socket.io-client';
import {
  Mic,
  MicOff,
  Camera,
  CameraOff,
  PhoneOff,
  Send,
  CheckCircle2,
  Clock,
  ChevronRight,
  Volume2,
  VolumeX,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { useAuthStore } from '@/store/authStore';
import { useInterviewStore } from '@/store/interviewStore';
import interviewService from '@/services/interviewService';

// ---------------------------------------------------------------------------
// Constants & Configuration
// ---------------------------------------------------------------------------

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:4000';

const PHASES = [
  'Introduction',
  'Warm-up',
  'Technical',
  'Deep Technical',
  'Behavioral',
  'Scenario',
  'Candidate Questions',
  'Closing',
] as const;

type Phase = (typeof PHASES)[number];

const THINKING_STAGES: Record<string, string[]> = {
  analyzing: [
    '🧠 Analyzing your technical correctness...',
    '📊 Evaluating communication & clarity...',
    '📝 Generating recruiter notes...',
  ],
  followup: [
    '💭 Formulating contextual follow-up...',
    '🎯 Calibrating next question difficulty...',
  ],
  feedback: [
    '✨ Compiling comprehensive interview report...',
    '📈 Finalizing competency scores...',
  ],
};

interface RecruiterInfo {
  name: string;
  role: string;
  team: string;
  company: string;
  personality: string;
  exp: number;
}

// ---------------------------------------------------------------------------
// ThinkingOverlay — Animated Loading State
// ---------------------------------------------------------------------------

function ThinkingOverlay({ state }: { state: string }) {
  const messages = THINKING_STAGES[state] ?? ['⏳ Processing your response...'];
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIdx((prev) => (prev + 1) % messages.length);
    }, 1800);
    return () => clearInterval(interval);
  }, [messages.length]);

  return (
    <motion.div
      key="thinking-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md"
      aria-live="polite"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col items-center gap-6 p-8 rounded-3xl bg-slate-900/90 border border-violet-500/30 shadow-2xl max-w-md text-center"
      >
        {/* Pulsing visualizer rings */}
        <div className="relative h-24 w-24 flex items-center justify-center">
          {[0, 1, 2].map((ring) => (
            <motion.div
              key={ring}
              animate={{ scale: [1, 1.45 + ring * 0.15, 1], opacity: [0.6, 0.1, 0.6] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut', delay: ring * 0.3 }}
              className="absolute inset-0 rounded-full border border-violet-500/40"
            />
          ))}
          <div className="h-16 w-16 rounded-full bg-gradient-to-tr from-violet-600 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-violet-900/50">
            <Sparkles className="h-8 w-8 text-white animate-spin" style={{ animationDuration: '6s' }} />
          </div>
        </div>

        {/* Dynamic messages */}
        <AnimatePresence mode="wait">
          <motion.p
            key={idx}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35 }}
            className="text-lg font-semibold text-white tracking-wide"
          >
            {messages[idx]}
          </motion.p>
        </AnimatePresence>

        <p className="text-slate-400 text-xs">
          The AI interviewer is evaluating your answer across multiple competencies
        </p>
      </motion.div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Circular Timer Component
// ---------------------------------------------------------------------------

function CircularTimer({ seconds, maxSeconds }: { seconds: number; maxSeconds: number }) {
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.max(0, seconds / (maxSeconds || 120));
  const dashOffset = circumference * (1 - progress);
  const color = seconds > 60 ? '#10b981' : seconds > 25 ? '#f59e0b' : '#ef4444';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;

  return (
    <div className="relative flex items-center justify-center w-20 h-20 shrink-0">
      <svg width="80" height="80" viewBox="0 0 80 80" className="-rotate-90">
        <circle cx="40" cy="40" r={radius} fill="none" stroke="#1e293b" strokeWidth="6" />
        <circle
          cx="40"
          cy="40"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          style={{ transition: 'stroke-dashoffset 0.9s linear, stroke 0.5s ease' }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-xs font-bold tabular-nums" style={{ color }}>
          {mins}:{secs.toString().padStart(2, '0')}
        </span>
        <Clock className="h-2.5 w-2.5 text-slate-500 mt-0.5" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Phase Ladder Timeline
// ---------------------------------------------------------------------------

function PhasesTimeline({ current }: { current: Phase | null }) {
  const currentIdx = current ? PHASES.indexOf(current) : 0;

  return (
    <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-1 px-2">
      {PHASES.map((phase, i) => {
        const isDone = i < currentIdx;
        const isActive = i === currentIdx;
        return (
          <div key={phase} className="flex items-center shrink-0">
            <div
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all ${
                isActive
                  ? 'bg-violet-600 text-white shadow-md shadow-violet-900/50 border border-violet-400/40'
                  : isDone
                  ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/40'
                  : 'bg-slate-900/60 text-slate-500 border border-slate-800/60'
              }`}
            >
              {isDone ? '✓ ' : ''}{phase}
            </div>
            {i < PHASES.length - 1 && (
              <ChevronRight
                className={`h-3 w-3 mx-0.5 shrink-0 ${isDone ? 'text-emerald-600' : 'text-slate-800'}`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Recruiter Tile (Google Meet Video Tile Style)
// ---------------------------------------------------------------------------

function RecruiterTile({
  recruiter,
  isSpeaking,
  ttsActive,
  onToggleTTS,
}: {
  recruiter: RecruiterInfo | null;
  isSpeaking: boolean;
  ttsActive: boolean;
  onToggleTTS: () => void;
}) {
  const company = recruiter?.company ?? 'Google';
  const COMPANY_COLORS: Record<string, string> = {
    Google: '#4285F4',
    Amazon: '#FF9900',
    Microsoft: '#00BCF2',
    Meta: '#0866FF',
    Apple: '#A2AAAD',
    Netflix: '#E50914',
    Startup: '#10B981',
    default: '#8B5CF6',
  };
  const accent = COMPANY_COLORS[company] ?? COMPANY_COLORS.default;

  const initials = recruiter?.name
    ? recruiter.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'AI';

  return (
    <div className="relative flex flex-col items-center justify-center h-full w-full rounded-2xl bg-gradient-to-b from-slate-900 via-slate-950 to-black overflow-hidden border border-slate-800/80 shadow-2xl">
      {/* Background ambient lighting */}
      <div
        className="absolute inset-0 opacity-20 pointer-events-none transition-opacity duration-700"
        style={{
          background: `radial-gradient(circle at center, ${accent}, transparent 70%)`,
          opacity: isSpeaking ? 0.35 : 0.15,
        }}
      />

      {/* Speaking voice rings */}
      <AnimatePresence>
        {isSpeaking && (
          <>
            {[1, 2, 3].map((ring) => (
              <motion.div
                key={ring}
                className="absolute rounded-full border-2 pointer-events-none"
                style={{ borderColor: `${accent}66` }}
                initial={{ width: 130, height: 130, opacity: 0.9 }}
                animate={{ width: 130 + ring * 50, height: 130 + ring * 50, opacity: 0 }}
                transition={{ duration: 1.6, repeat: Infinity, delay: ring * 0.35, ease: 'easeOut' }}
              />
            ))}
          </>
        )}
      </AnimatePresence>

      {/* Recruiter Avatar */}
      <motion.div
        animate={isSpeaking ? { scale: [1, 1.05, 1] } : { scale: 1 }}
        transition={{ duration: 0.8, repeat: isSpeaking ? Infinity : 0, ease: 'easeInOut' }}
        className="relative w-32 h-32 rounded-full flex items-center justify-center text-4xl font-black text-white shadow-2xl z-10 select-none"
        style={{
          background: `linear-gradient(135deg, ${accent}dd, ${accent}55)`,
          border: `4px solid ${accent}88`,
          boxShadow: isSpeaking ? `0 0 40px ${accent}66, 0 0 80px ${accent}33` : `0 0 20px ${accent}22`,
        }}
      >
        {initials}
      </motion.div>

      {/* Recruiter Details */}
      <div className="z-10 mt-5 text-center px-4">
        <p className="text-white font-bold text-lg tracking-tight">{recruiter?.name ?? 'Alex Vance'}</p>
        <p className="text-slate-400 text-sm font-medium">{recruiter?.role ?? 'Senior Technical Interviewer'}</p>
        <div className="flex items-center justify-center gap-2 mt-2">
          {recruiter?.company && (
            <span
              className="inline-block text-xs font-semibold px-3 py-0.5 rounded-full"
              style={{ background: `${accent}22`, color: accent, border: `1px solid ${accent}55` }}
            >
              {recruiter.company}
            </span>
          )}
          {recruiter?.team && (
            <span className="text-xs text-slate-500 font-medium">{recruiter.team}</span>
          )}
        </div>
      </div>

      {/* Status Pill (Speaking or Listening) */}
      <div className="z-10 absolute bottom-4 left-1/2 -translate-x-1/2">
        <div
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full backdrop-blur-md border text-xs font-medium transition-all ${
            isSpeaking
              ? 'bg-violet-950/80 border-violet-500/50 text-violet-200 shadow-lg shadow-violet-900/30'
              : 'bg-black/60 border-white/10 text-slate-400'
          }`}
        >
          {isSpeaking ? (
            <>
              <span className="flex gap-0.5 items-end h-3">
                {[0, 1, 2, 3, 4].map((i) => (
                  <motion.span
                    key={i}
                    className="w-1 bg-violet-400 rounded-full"
                    animate={{ height: [4, 12 + i * 2, 4] }}
                    transition={{ duration: 0.45, repeat: Infinity, delay: i * 0.1 }}
                  />
                ))}
              </span>
              <span>Speaking out loud</span>
            </>
          ) : (
            <>
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Listening to candidate</span>
            </>
          )}
        </div>
      </div>

      {/* Personality Badge (Top Left) */}
      {recruiter?.personality && (
        <div className="z-10 absolute top-4 left-4 text-[11px] px-3 py-1 rounded-full bg-slate-900/80 backdrop-blur-md text-slate-300 border border-slate-700/60 shadow">
          {recruiter.personality}
        </div>
      )}

      {/* Voice TTS Toggle (Top Right) */}
      <button
        onClick={onToggleTTS}
        title={ttsActive ? 'Mute AI voice' : 'Enable AI voice'}
        className={`z-10 absolute top-4 right-4 flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-all ${
          ttsActive
            ? 'bg-violet-950/70 border-violet-700/60 text-violet-300 hover:bg-violet-900/70'
            : 'bg-slate-900/80 border-slate-700 text-slate-400 hover:bg-slate-800'
        }`}
      >
        {ttsActive ? <Volume2 className="h-3.5 w-3.5 text-violet-400" /> : <VolumeX className="h-3.5 w-3.5" />}
        <span className="text-[10px]">{ttsActive ? 'AI Voice On' : 'Muted'}</span>
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Candidate Camera PiP Tile
// ---------------------------------------------------------------------------

function UserTile({
  videoRef,
  isCameraOff,
  isMuted,
  userName,
}: {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  isCameraOff: boolean;
  isMuted: boolean;
  userName: string;
}) {
  return (
    <div className="relative rounded-xl overflow-hidden bg-slate-900 border border-slate-700/80 shadow-md w-44 h-24 shrink-0">
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className={`w-full h-full object-cover transition-opacity duration-300 ${isCameraOff ? 'opacity-0' : 'opacity-100'}`}
      />
      {isCameraOff && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-800">
          <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center text-slate-300 text-sm font-bold">
            {userName.charAt(0).toUpperCase()}
          </div>
        </div>
      )}
      <div className="absolute bottom-1.5 left-2 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm px-1.5 py-0.5 rounded">
        <span className="text-[10px] text-white font-medium truncate max-w-[90px]">{userName} (You)</span>
        {isMuted && <MicOff className="h-3 w-3 text-red-400" />}
      </div>
      {!isCameraOff && (
        <div className="absolute top-1.5 right-1.5 flex items-center gap-1 bg-black/60 backdrop-blur-sm px-1.5 py-0.5 rounded-full">
          <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
          <span className="text-[9px] text-white font-medium uppercase">Live</span>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Question Bubble
// ---------------------------------------------------------------------------

function QuestionBubble({
  text,
  number,
  count,
  phase,
  isRecruiterSpeaking,
  onReplayVoice,
}: {
  text: string;
  number: number;
  count: number;
  phase: Phase | null;
  isRecruiterSpeaking: boolean;
  onReplayVoice?: () => void;
}) {
  return (
    <motion.div
      key={text}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
      className="rounded-2xl bg-slate-900/90 border border-violet-500/25 p-5 shadow-xl relative overflow-hidden"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {phase && (
            <span className="text-[11px] font-semibold text-violet-300 bg-violet-950/70 border border-violet-700/50 px-2.5 py-0.5 rounded-full">
              {phase}
            </span>
          )}
          <span className="text-[11px] font-bold text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-md">
            Question {number} of {count}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {onReplayVoice && (
            <button
              onClick={onReplayVoice}
              className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-violet-950/80 hover:bg-violet-900 text-violet-200 border border-violet-700/60 transition-all shadow cursor-pointer active:scale-95"
              title="Click to hear AI interviewer speak"
            >
              <Volume2 className={`h-3.5 w-3.5 ${isRecruiterSpeaking ? 'text-violet-300 animate-pulse' : 'text-slate-300'}`} />
              <span>{isRecruiterSpeaking ? 'Speaking...' : '🔊 Listen'}</span>
            </button>
          )}
          <div className="flex items-center gap-1 text-[11px] font-medium text-slate-400">
            <span
              className={`h-2 w-2 rounded-full ${isRecruiterSpeaking ? 'bg-violet-400 animate-ping' : 'bg-emerald-400 animate-pulse'}`}
            />
            <span className="hidden sm:inline">{isRecruiterSpeaking ? 'Interviewer Speaking' : 'Your Turn'}</span>
          </div>
        </div>
      </div>
      <p className="text-base md:text-lg font-medium text-slate-100 leading-relaxed">{text}</p>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Main RoomPage Component
// ---------------------------------------------------------------------------

export default function RoomPage() {
  const { id: sessionId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);

  // Zustand Store
  const currentQuestion = useInterviewStore((s) => s.currentQuestion);
  const transcript = useInterviewStore((s) => s.transcript);
  const thinkingState = useInterviewStore((s) => s.thinkingState);
  const timer = useInterviewStore((s) => s.timer);
  const questionCount = useInterviewStore((s) => s.questionCount);
  const currentQuestionIndex = useInterviewStore((s) => s.currentQuestionIndex);
  const {
    setSessionId,
    setQuestion,
    setThinking,
    setTimer,
    setQuestionCount,
    incrementQuestionIndex,
    reset: resetStore,
    setTranscript,
    appendTranscript,
  } = useInterviewStore();

  // Local State
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isConnected, setIsConnected] = useState(true);
  const [showEndDialog, setShowEndDialog] = useState(false);
  const [answerSubmitted, setAnswerSubmitted] = useState(false);
  const [answerStartTime, setAnswerStartTime] = useState<number>(Date.now());
  const [recruiter, setRecruiter] = useState<RecruiterInfo | null>({
    name: 'Emily Carter',
    role: 'Senior Staff Engineer',
    team: 'Platform Architecture',
    company: 'Google',
    personality: 'Technical & Inquisitive',
    exp: 10,
  });
  const [currentPhase, setCurrentPhase] = useState<Phase | null>('Introduction');
  const [recruiterSpeaking, setRecruiterSpeaking] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [typedInput, setTypedInput] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [silenceCountdown, setSilenceCountdown] = useState<number | null>(null);
  const [sessionInfo, setSessionInfo] = useState<{ role: string; experienceYears: number; difficulty: string } | null>(null);

  useEffect(() => {
    if (!sessionId) return;
    interviewService.getSession(sessionId)
      .then((data) => {
        if (data) {
          setSessionInfo({
            role: data.role,
            experienceYears: data.experienceYears,
            difficulty: data.difficulty,
          });
        }
      })
      .catch(() => {});
  }, [sessionId]);

  // Refs
  const socketRef = useRef<Socket | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const cameraPreviewRef = useRef<HTMLVideoElement>(null);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerMaxRef = useRef<number>(120);
  const sttRef = useRef<any>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const keepAliveIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load and listen to speech synthesis voices
  useEffect(() => {
    if (!('speechSynthesis' in window)) return;
    const loadVoices = () => {
      window.speechSynthesis.getVoices();
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    const unlockAudio = () => {
      try {
        window.speechSynthesis.resume();
      } catch {}
    };
    window.addEventListener('click', unlockAudio, { once: true });
    window.addEventListener('keydown', unlockAudio, { once: true });

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
      if (keepAliveIntervalRef.current) clearInterval(keepAliveIntervalRef.current);
    };
  }, []);

  const getBestVoice = useCallback((): SpeechSynthesisVoice | undefined => {
    if (!('speechSynthesis' in window)) return undefined;
    const voices = window.speechSynthesis.getVoices();
    if (!voices.length) return undefined;

    return (
      voices.find((v) => v.lang.startsWith('en') && (v.name.includes('Zira') || v.name.includes('Samantha') || v.name.includes('Jenny') || v.name.toLowerCase().includes('female') || v.name.includes('Natural'))) ||
      voices.find((v) => v.lang.startsWith('en-US')) ||
      voices.find((v) => v.lang.startsWith('en')) ||
      voices[0]
    );
  }, []);

  // ---------------------------------------------------------------------------
  // Camera & Mic Permissions
  // ---------------------------------------------------------------------------
  useEffect(() => {
    let active = true;
    navigator.mediaDevices
      ?.getUserMedia({ video: true, audio: true })
      .then((stream) => {
        if (!active) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (cameraPreviewRef.current) {
          cameraPreviewRef.current.srcObject = stream;
        }
      })
      .catch((err) => {
        console.warn('Media devices could not be accessed:', err.message);
      });

    return () => {
      active = false;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // ---------------------------------------------------------------------------
  // Timer Management
  // ---------------------------------------------------------------------------
  const stopTimer = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  }, []);

  const startTimer = useCallback(
    (seconds: number) => {
      stopTimer();
      timerMaxRef.current = seconds;
      setTimer(seconds);
      setAnswerStartTime(Date.now());
      timerIntervalRef.current = setInterval(() => {
        useInterviewStore.setState((s) => ({ timer: Math.max(0, s.timer - 1) }));
      }, 1000);
    },
    [stopTimer, setTimer]
  );

  // ---------------------------------------------------------------------------
  // Text to Speech (TTS)
  // ---------------------------------------------------------------------------
  const speakQuestion = useCallback(
    (text: string) => {
      if (!ttsEnabled || !('speechSynthesis' in window)) return;

      try {
        if (keepAliveIntervalRef.current) {
          clearInterval(keepAliveIntervalRef.current);
          keepAliveIntervalRef.current = null;
        }

        window.speechSynthesis.cancel();
        window.speechSynthesis.resume();

        const clean = text.replace(/[*_#`]/g, '').trim();
        const utterance = new SpeechSynthesisUtterance(clean);
        utterance.rate = 0.95;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        const voice = getBestVoice();
        if (voice) utterance.voice = voice;

        utterance.onstart = () => {
          setRecruiterSpeaking(true);
        };
        utterance.onend = () => {
          setRecruiterSpeaking(false);
          if (keepAliveIntervalRef.current) {
            clearInterval(keepAliveIntervalRef.current);
            keepAliveIntervalRef.current = null;
          }
        };
        utterance.onerror = (e) => {
          console.warn('SpeechSynthesis error:', e);
          setRecruiterSpeaking(false);
          if (keepAliveIntervalRef.current) {
            clearInterval(keepAliveIntervalRef.current);
            keepAliveIntervalRef.current = null;
          }
        };

        utteranceRef.current = utterance;
        (window as any).__apexUtterance = utterance;

        keepAliveIntervalRef.current = setInterval(() => {
          if (window.speechSynthesis.speaking) {
            window.speechSynthesis.resume();
          } else if (keepAliveIntervalRef.current) {
            clearInterval(keepAliveIntervalRef.current);
            keepAliveIntervalRef.current = null;
          }
        }, 5000);

        setTimeout(() => {
          try {
            window.speechSynthesis.resume();
            window.speechSynthesis.speak(utterance);
          } catch (e) {
            console.warn('speak invocation failed:', e);
          }
        }, 60);
      } catch (err) {
        console.warn('speakQuestion failed:', err);
      }
    },
    [ttsEnabled, getBestVoice]
  );

  // ---------------------------------------------------------------------------
  // Speech Recognition (Browser STT)
  // ---------------------------------------------------------------------------
  const startSTT = useCallback(() => {
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) return;

    try {
      const recognition = new SpeechRec();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      sttRef.current = recognition;

      recognition.onresult = (event: any) => {
        let finalChunk = '';
        let interimChunk = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalChunk += event.results[i][0].transcript;
          } else {
            interimChunk += event.results[i][0].transcript;
          }
        }

        if (interimChunk) {
          setInterimTranscript(interimChunk);
        }

        if (finalChunk) {
          setInterimTranscript('');
          appendTranscript(finalChunk + ' ');
          setTypedInput((prev) => (prev ? prev.trim() + ' ' + finalChunk.trim() : finalChunk.trim()));
        }

        // Reset silence countdown when speaking
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        setSilenceCountdown(null);

        // 4-second silence detection
        silenceTimerRef.current = setTimeout(() => {
          setSilenceCountdown(4);
          const interval = setInterval(() => {
            setSilenceCountdown((prev) => {
              if (prev === null || prev <= 1) {
                clearInterval(interval);
                return null;
              }
              return prev - 1;
            });
          }, 1000);
        }, 4000);
      };

      recognition.onerror = () => {};
      recognition.onend = () => {
        if (!isMuted && currentQuestion && sttRef.current) {
          try {
            recognition.start();
          } catch {}
        }
      };

      recognition.start();
    } catch {}
  }, [appendTranscript, isMuted, currentQuestion]);

  const stopSTT = useCallback(() => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    setSilenceCountdown(null);
    try {
      sttRef.current?.stop();
    } catch {}
    sttRef.current = null;
  }, []);

  // Manage STT lifecycle
  useEffect(() => {
    if (currentQuestion && !isMuted) {
      stopSTT();
      startSTT();
    } else {
      stopSTT();
    }
    return stopSTT;
  }, [currentQuestion?.id, isMuted, startSTT, stopSTT]);

  // ---------------------------------------------------------------------------
  // Answer Submission
  // ---------------------------------------------------------------------------
  const handleSubmitAnswer = useCallback(() => {
    if (!currentQuestion || answerSubmitted) return;
    stopTimer();
    stopSTT();
    window.speechSynthesis?.cancel();
    setRecruiterSpeaking(false);
    setAnswerSubmitted(true);

    const finalAnswer = typedInput.trim() || transcript.trim() || 'Candidate provided verbal answer';
    const durationSeconds = Math.max(1, Math.round((Date.now() - answerStartTime) / 1000));

    if (socketRef.current?.connected) {
      socketRef.current.emit('answer', {
        sessionId,
        questionId: currentQuestion.id,
        transcript: finalAnswer,
        durationSeconds,
      });
    }

    setTranscript('');
    setTypedInput('');
    setInterimTranscript('');
    setThinking('analyzing');
  }, [
    currentQuestion,
    answerSubmitted,
    stopTimer,
    stopSTT,
    typedInput,
    transcript,
    answerStartTime,
    sessionId,
    setTranscript,
    setThinking,
  ]);

  // Auto-submit when circular timer hits 0
  useEffect(() => {
    if (timer === 0 && currentQuestion && !answerSubmitted) {
      handleSubmitAnswer();
    }
  }, [timer, currentQuestion, answerSubmitted, handleSubmitAnswer]);

  // ---------------------------------------------------------------------------
  // Socket.io Setup
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!sessionId) return;
    setSessionId(sessionId);

    const socket = io(SOCKET_URL, {
      auth: { token: accessToken },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      socket.emit('ready', { sessionId });
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on(
      'startInterview',
      (payload: {
        questionCount: number;
        recruiterName?: string;
        recruiterRole?: string;
        recruiterTeam?: string;
        recruiterExp?: number;
        company?: string;
        personality?: string;
      }) => {
        setThinking(null);
        setQuestionCount(payload.questionCount);
        if (payload.recruiterName) {
          setRecruiter({
            name: payload.recruiterName,
            role: payload.recruiterRole ?? 'Staff Technical Recruiter',
            team: payload.recruiterTeam ?? 'Core Systems',
            company: payload.company ?? 'Google',
            personality: payload.personality ?? 'Inquisitive & Professional',
            exp: payload.recruiterExp ?? 10,
          });
        }
      }
    );

    const handleNewQuestion = (q: {
      questionId: string;
      text: string;
      orderIndex: number;
      timeLimit?: number;
      currentPhase?: string;
    }) => {
      const qObj = {
        id: q.questionId,
        text: q.text,
        audioUrl: '',
        orderIndex: q.orderIndex,
        timeLimit: q.timeLimit ?? 120,
      };

      setThinking(null);
      setQuestion(qObj);
      setAnswerSubmitted(false);
      incrementQuestionIndex();
      startTimer(qObj.timeLimit);

      if (q.currentPhase) {
        setCurrentPhase(q.currentPhase as Phase);
      }

      speakQuestion(q.text);
    };

    socket.on('question', handleNewQuestion);
    socket.on('nextQuestion', handleNewQuestion);

    socket.on('thinking', ({ state }: { state: 'analyzing' | 'followup' | 'feedback' | null }) => {
      setThinking(state ?? null);
      if (state) {
        stopTimer();
        stopSTT();
      }
    });

    socket.on('report', ({ reportId }: { reportId: string }) => {
      stopTimer();
      stopSTT();
      window.speechSynthesis?.cancel();
      resetStore();
      const target = reportId ? `/report/${reportId}` : `/dashboard`;
      navigate(target);
    });

    socket.on('error', ({ message }: { message: string }) => {
      console.warn('Socket error received:', message);
      setThinking(null);
      toast({
        title: 'Notice',
        description: message || 'Continuing session...',
      });
    });

    return () => {
      stopTimer();
      stopSTT();
      window.speechSynthesis?.cancel();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [
    sessionId,
    accessToken,
    setSessionId,
    setQuestion,
    setThinking,
    setQuestionCount,
    incrementQuestionIndex,
    startTimer,
    stopTimer,
    stopSTT,
    speakQuestion,
    resetStore,
    navigate,
  ]);

  // Safety: auto-dismiss thinking state if stuck for more than 10 seconds
  useEffect(() => {
    if (thinkingState) {
      const safetyTimer = setTimeout(() => {
        setThinking(null);
      }, 10000);
      return () => clearTimeout(safetyTimer);
    }
  }, [thinkingState, setThinking]);

  // Fallback initial question if socket doesn't push within 3 seconds
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!currentQuestion) {
        const fallback = {
          id: 'initial-fallback-q',
          text: `Hello and welcome to your interview! I'm Emily Carter, Senior Staff Engineer at Google. To get started, could you walk me through your background and an interesting technical project you built recently?`,
          audioUrl: '',
          orderIndex: 0,
          timeLimit: 120,
        };
        setThinking(null);
        setQuestion(fallback);
        setQuestionCount(5);
        startTimer(120);
        speakQuestion(fallback.text);
      }
    }, 3500);

    return () => clearTimeout(timeout);
  }, [currentQuestion, setQuestion, setQuestionCount, startTimer, speakQuestion, setThinking]);

  // ---------------------------------------------------------------------------
  // Action Controls
  // ---------------------------------------------------------------------------
  const handleToggleMute = useCallback(() => {
    streamRef.current?.getAudioTracks().forEach((t) => {
      t.enabled = isMuted;
    });
    setIsMuted((prev) => !prev);
    if (!isMuted) {
      stopSTT();
    } else if (currentQuestion) {
      startSTT();
    }
  }, [isMuted, currentQuestion, stopSTT, startSTT]);

  const handleToggleCamera = useCallback(() => {
    streamRef.current?.getVideoTracks().forEach((t) => {
      t.enabled = isCameraOff;
    });
    setIsCameraOff((prev) => !prev);
  }, [isCameraOff]);

  const handleToggleTTS = useCallback(() => {
    if (ttsEnabled) {
      window.speechSynthesis?.cancel();
      setRecruiterSpeaking(false);
    } else if (currentQuestion?.text) {
      speakQuestion(currentQuestion.text);
    }
    setTtsEnabled((prev) => !prev);
  }, [ttsEnabled, currentQuestion, speakQuestion]);

  const handleEndInterview = useCallback(() => {
    stopTimer();
    stopSTT();
    window.speechSynthesis?.cancel();
    if (socketRef.current?.connected) {
      socketRef.current.emit('endInterview', { sessionId });
    }
    resetStore();
    setShowEndDialog(false);
    navigate('/dashboard');
  }, [stopTimer, stopSTT, sessionId, resetStore, navigate]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  const displayQuestionNumber = currentQuestionIndex || 1;
  const isThinking = Boolean(thinkingState);
  const userName = user?.displayName ?? 'You';

  return (
    <div className="fixed inset-0 z-40 bg-slate-950 text-slate-100 flex flex-col overflow-hidden font-sans select-none">
      {/* Dynamic Thinking Overlay */}
      <AnimatePresence>
        {isThinking && thinkingState && <ThinkingOverlay state={thinkingState} />}
      </AnimatePresence>

      {/* ── Top Header ── */}
      <header className="flex items-center justify-between px-5 py-2.5 border-b border-slate-800/80 shrink-0 bg-slate-950/95 backdrop-blur-md z-20">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 cursor-pointer" onClick={() => navigate('/dashboard')}>
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-violet-600 to-fuchsia-600 flex items-center justify-center font-black text-white text-xs shadow-md shadow-violet-500/20">
              A
            </div>
            <span className="text-base font-bold tracking-tight text-white">apex</span>
            <span className="text-base font-bold tracking-tight text-violet-400">.ai</span>
          </div>
          <div className="hidden sm:flex items-center">
            <ChevronRight className="h-3.5 w-3.5 text-slate-600 mx-1" />
            <span className="text-xs text-slate-400 font-medium">Live Interview Session</span>
          </div>
        </div>

        {/* Phase Ladder Navigation (Center) */}
        <div className="hidden md:flex flex-1 justify-center px-4 items-center gap-3">
          {sessionInfo && (
            <div className="hidden xl:flex items-center gap-2 bg-slate-900/90 border border-violet-500/30 px-3 py-1 rounded-full text-xs shrink-0 shadow-sm">
              <span className="text-violet-300 font-semibold">{sessionInfo.role}</span>
              <span className="text-slate-600">·</span>
              <span className="text-slate-300">{sessionInfo.experienceYears} YOE</span>
              <span className="text-slate-600">·</span>
              <span className="text-slate-400">{sessionInfo.difficulty}</span>
            </div>
          )}
          <PhasesTimeline current={currentPhase} />
        </div>

        {/* Status Indicators (Right) */}
        <div className="flex items-center gap-2.5">
          {silenceCountdown !== null && (
            <motion.span
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              className="text-xs px-2.5 py-1 rounded-full bg-amber-950/70 border border-amber-600/50 text-amber-300 font-medium"
            >
              Auto-submit in {silenceCountdown}s
            </motion.span>
          )}

          <span
            className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border ${
              isConnected
                ? 'border-emerald-700/50 text-emerald-400 bg-emerald-950/30'
                : 'border-amber-700/50 text-amber-400 bg-amber-950/30'
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}
            />
            {isConnected ? 'Live' : 'Connecting...'}
          </span>
        </div>
      </header>

      {/* ── Main Viewport Grid ── */}
      <main className="flex-1 flex flex-col md:flex-row gap-3 p-3 overflow-hidden min-h-0 bg-slate-950">
        {/* Left: Recruiter Stage (Google Meet Style) */}
        <div className="flex-1 flex flex-col min-w-0 h-full">
          <RecruiterTile
            recruiter={recruiter}
            isSpeaking={recruiterSpeaking}
            ttsActive={ttsEnabled}
            onToggleTTS={handleToggleTTS}
          />
        </div>

        {/* Right: Question + Interactive Transcript & Answer Panel */}
        <div className="w-full md:w-[440px] lg:w-[480px] flex flex-col gap-3 h-full shrink-0 min-h-0">
          {/* Question Display Bubble */}
          <div className="shrink-0">
            <AnimatePresence mode="wait">
              {currentQuestion ? (
                <QuestionBubble
                  key={currentQuestion.id}
                  text={currentQuestion.text}
                  number={displayQuestionNumber}
                  count={questionCount}
                  phase={currentPhase}
                  isRecruiterSpeaking={recruiterSpeaking}
                  onReplayVoice={() => currentQuestion?.text && speakQuestion(currentQuestion.text)}
                />
              ) : (
                <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-6 flex flex-col items-center justify-center gap-3 text-center">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                    className="h-7 w-7 rounded-full border-3 border-slate-700 border-t-violet-500"
                  />
                  <p className="text-slate-400 text-sm font-medium">Connecting to AI interviewer...</p>
                </div>
              )}
            </AnimatePresence>
          </div>

          {/* Interactive Answer & Transcript Area */}
          <div className="flex-1 flex flex-col rounded-2xl bg-slate-900/80 border border-slate-800/80 overflow-hidden shadow-lg min-h-0">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-800/60 bg-slate-950/40 shrink-0">
              <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
                Your Answer
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Voice + Text Active
                </span>
              </div>
            </div>

            {/* Answer Input Textarea */}
            <div className="flex-1 p-3 flex flex-col min-h-0">
              {interimTranscript && (
                <div className="flex items-center gap-2 text-xs text-violet-300 bg-violet-950/70 border border-violet-700/60 px-3 py-1.5 rounded-lg mb-2 shadow-sm animate-pulse">
                  <span className="h-2 w-2 rounded-full bg-violet-400 animate-ping shrink-0" />
                  <span className="font-semibold text-violet-300 shrink-0">Live Voice:</span>
                  <span className="italic text-slate-100 truncate">"{interimTranscript}"</span>
                </div>
              )}
              <textarea
                value={typedInput}
                onChange={(e) => setTypedInput(e.target.value)}
                placeholder="Speak into your microphone or type your answer here..."
                disabled={isThinking || answerSubmitted}
                className="w-full flex-1 bg-slate-950/60 border border-slate-800 rounded-xl p-3 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-violet-500/60 focus:ring-1 focus:ring-violet-500/40 resize-none transition-all leading-relaxed"
              />
              <div className="flex items-center justify-between mt-2 pt-1 text-slate-500 text-[11px]">
                <span>{typedInput.trim().split(/\s+/).filter(Boolean).length} words</span>
                <span>Type or speak naturally</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ── Bottom Controls Bar ── */}
      <footer className="shrink-0 border-t border-slate-800/80 bg-slate-950/95 backdrop-blur-md px-5 py-3 z-20">
        <div className="flex items-center justify-between gap-4 max-w-7xl mx-auto">
          {/* Left: User Live Camera PiP + Countdown Ring */}
          <div className="flex items-center gap-3 shrink-0">
            <UserTile
              videoRef={cameraPreviewRef}
              isCameraOff={isCameraOff}
              isMuted={isMuted}
              userName={userName}
            />
            {currentQuestion && (
              <CircularTimer seconds={timer} maxSeconds={timerMaxRef.current} />
            )}
          </div>

          {/* Center: Primary Call Controls */}
          <div className="flex items-center gap-2.5">
            {/* Mic Toggle */}
            <button
              onClick={handleToggleMute}
              title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
              className={`flex flex-col items-center gap-1 rounded-xl px-4 py-2 transition-all text-xs font-medium ${
                isMuted
                  ? 'bg-red-950/60 border border-red-700/60 text-red-400 hover:bg-red-900/60 shadow-lg shadow-red-950/40'
                  : 'bg-slate-800/80 border border-slate-700/60 text-slate-200 hover:bg-slate-700/80'
              }`}
            >
              {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              <span>{isMuted ? 'Unmute' : 'Mute'}</span>
            </button>

            {/* Camera Toggle */}
            <button
              onClick={handleToggleCamera}
              title={isCameraOff ? 'Turn camera on' : 'Turn camera off'}
              className={`flex flex-col items-center gap-1 rounded-xl px-4 py-2 transition-all text-xs font-medium ${
                isCameraOff
                  ? 'bg-red-950/60 border border-red-700/60 text-red-400 hover:bg-red-900/60'
                  : 'bg-slate-800/80 border border-slate-700/60 text-slate-200 hover:bg-slate-700/80'
              }`}
            >
              {isCameraOff ? <CameraOff className="h-4 w-4" /> : <Camera className="h-4 w-4" />}
              <span>{isCameraOff ? 'Start Cam' : 'Stop Cam'}</span>
            </button>

            {/* Submit Answer Button */}
            {currentQuestion && !isThinking && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2 }}
              >
                <Button
                  onClick={handleSubmitAnswer}
                  disabled={answerSubmitted}
                  size="lg"
                  className={`px-7 font-bold transition-all shadow-lg ${
                    answerSubmitted
                      ? 'bg-emerald-800/60 text-emerald-300 cursor-not-allowed border border-emerald-600/40'
                      : 'bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white shadow-violet-900/50'
                  }`}
                >
                  {answerSubmitted ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Evaluating...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Submit Answer
                    </>
                  )}
                </Button>
              </motion.div>
            )}

            {/* End Interview */}
            <button
              onClick={() => setShowEndDialog(true)}
              title="End Interview"
              className="flex flex-col items-center gap-1 rounded-xl px-4 py-2 bg-red-950/40 border border-red-700/40 text-red-400 hover:bg-red-900/60 transition-colors text-xs font-medium"
            >
              <PhoneOff className="h-4 w-4" />
              <span>End</span>
            </button>
          </div>

          {/* Right: Question Count & Progress */}
          <div className="shrink-0 text-right">
            <span className="text-2xl font-black text-white tabular-nums">
              {questionCount > 0 ? `${displayQuestionNumber}/${questionCount}` : '—'}
            </span>
            <p className="text-[11px] text-slate-500 font-medium">Questions</p>
          </div>
        </div>
      </footer>

      {/* ── End Interview Confirmation Modal ── */}
      <Dialog open={showEndDialog} onOpenChange={setShowEndDialog}>
        <DialogContent className="bg-slate-900 border-slate-700 text-slate-100 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">End Interview Early?</DialogTitle>
            <DialogDescription className="text-slate-400">
              Are you sure you want to conclude the interview? A full evaluation report will be compiled based on the answers you have provided so far.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 mt-2">
            <Button
              variant="outline"
              onClick={() => setShowEndDialog(false)}
              className="border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200"
            >
              Resume Interview
            </Button>
            <Button onClick={handleEndInterview} className="bg-red-700 hover:bg-red-600 text-white font-semibold">
              <PhoneOff className="h-4 w-4 mr-1.5" />
              Conclude & Generate Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
