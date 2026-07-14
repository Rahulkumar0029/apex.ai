import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Camera,
  Mic,
  Volume2,
  Wifi,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertTriangle,
  ArrowRight,
  Info,
  Building2,
  Star,
  Users,
  Briefcase,
  Shield,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import interviewService, { type SessionData } from '@/services/interviewService';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type CheckStatus = 'idle' | 'checking' | 'granted' | 'denied' | 'warning';

interface SpeakerState {
  status: CheckStatus;
  awaitingConfirm: boolean;
}

interface InternetState {
  status: CheckStatus;
  mbps: number | null;
}

// ---------------------------------------------------------------------------
// Company color palettes
// ---------------------------------------------------------------------------

const COMPANY_STYLES: Record<string, { gradient: string; accent: string; badge: string }> = {
  Google:    { gradient: 'from-blue-600/20 via-red-600/10 to-yellow-600/10', accent: '#4285F4', badge: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
  Amazon:    { gradient: 'from-orange-600/20 via-amber-600/10 to-yellow-600/10', accent: '#FF9900', badge: 'bg-orange-500/20 text-orange-300 border-orange-500/30' },
  Microsoft: { gradient: 'from-cyan-600/20 via-blue-600/10 to-indigo-600/10', accent: '#00BCF2', badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' },
  Meta:      { gradient: 'from-blue-700/20 via-indigo-600/10 to-violet-600/10', accent: '#0866FF', badge: 'bg-blue-600/20 text-blue-300 border-blue-600/30' },
  Apple:     { gradient: 'from-slate-600/20 via-gray-600/10 to-zinc-600/10', accent: '#A2AAAD', badge: 'bg-slate-500/20 text-slate-300 border-slate-500/30' },
  Netflix:   { gradient: 'from-red-700/20 via-red-600/10 to-rose-600/10', accent: '#E50914', badge: 'bg-red-500/20 text-red-300 border-red-500/30' },
  default:   { gradient: 'from-violet-600/20 via-purple-600/10 to-indigo-600/10', accent: '#8B5CF6', badge: 'bg-violet-500/20 text-violet-300 border-violet-500/30' },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function checkInternetSpeed(): Promise<number> {
  const start = Date.now();
  await fetch('https://www.google.com/images/phd/px.gif?r=' + Math.random(), {
    cache: 'no-cache',
    mode: 'no-cors',
  });
  const duration = (Date.now() - start) / 1000;
  return Math.max(1, Math.round(100 / (duration * 8)));
}

function playSpeakerBeep(): void {
  const ctx = new AudioContext();
  const osc = ctx.createOscillator();
  osc.connect(ctx.destination);
  osc.frequency.value = 440;
  osc.start();
  osc.stop(ctx.currentTime + 0.4);
  setTimeout(() => ctx.close(), 600);
}

function getPersonalityIcon(personality?: string) {
  switch (personality) {
    case 'Friendly': return '😊';
    case 'Strict': return '🎯';
    case 'Curious': return '🔍';
    case 'Skeptical': return '🤨';
    case 'Encouraging': return '💪';
    default: return '🤝';
  }
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatusIcon({ status }: { status: CheckStatus }) {
  switch (status) {
    case 'checking': return <Loader2 className="h-4 w-4 text-violet-400 animate-spin" />;
    case 'granted':  return <CheckCircle2 className="h-4 w-4 text-emerald-400" />;
    case 'denied':   return <XCircle className="h-4 w-4 text-red-400" />;
    case 'warning':  return <AlertTriangle className="h-4 w-4 text-amber-400" />;
    default:         return <div className="h-4 w-4 rounded-full border border-slate-600" />;
  }
}

interface CheckRowProps {
  icon: React.ReactNode;
  label: string;
  status: CheckStatus;
  detail?: React.ReactNode;
}

function CheckRow({ icon, label, status, detail }: CheckRowProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col gap-1"
    >
      <div className="flex items-center justify-between rounded-xl bg-slate-800/60 px-4 py-2.5 border border-slate-700/50 hover:border-slate-600/70 transition-colors">
        <div className="flex items-center gap-3">
          <span className="text-slate-400">{icon}</span>
          <span className="text-sm font-medium text-slate-200">{label}</span>
        </div>
        <StatusIcon status={status} />
      </div>
      <AnimatePresence>
        {detail && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {detail}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Mic Volume Visualizer Bar
// ---------------------------------------------------------------------------

function MicVolumeBar({ volume }: { volume: number }) {
  const bars = 16;
  return (
    <div className="flex items-end gap-0.5 h-6">
      {Array.from({ length: bars }).map((_, i) => {
        const threshold = (i / bars) * 100;
        const active = volume > threshold;
        const color = i < bars * 0.5
          ? 'bg-emerald-400'
          : i < bars * 0.75
          ? 'bg-yellow-400'
          : 'bg-red-400';
        return (
          <motion.div
            key={i}
            className={`w-1 rounded-sm transition-all duration-75 ${active ? color : 'bg-slate-700'}`}
            style={{ height: `${30 + (i % 3) * 25}%` }}
            animate={{ opacity: active ? 1 : 0.3 }}
          />
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Recruiter Profile Card
// ---------------------------------------------------------------------------

interface RecruiterCardProps {
  session: SessionData | null;
  loading: boolean;
}

function RecruiterCard({ session, loading }: RecruiterCardProps) {
  const company = session?.company ?? 'default';
  const style = COMPANY_STYLES[company] ?? COMPANY_STYLES.default;

  if (loading) {
    return (
      <div className="rounded-2xl bg-slate-900 border border-slate-700/60 p-5 space-y-3">
        {[80, 60, 70, 50].map((w, i) => (
          <div key={i} className={`h-4 rounded bg-slate-800 animate-pulse`} style={{ width: `${w}%` }} />
        ))}
      </div>
    );
  }

  if (!session?.recruiterName) {
    return (
      <div className="rounded-2xl bg-slate-900 border border-slate-700/60 p-5">
        <p className="text-slate-500 text-sm text-center">Recruiter assigned on start</p>
      </div>
    );
  }

  const initials = session.recruiterName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={`relative rounded-2xl bg-gradient-to-br ${style.gradient} border border-slate-700/60 overflow-hidden`}
    >
      {/* Glow accent */}
      <div
        className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-20 pointer-events-none"
        style={{ background: style.accent }}
      />

      <div className="relative p-5">
        {/* Header row */}
        <div className="flex items-start gap-4 mb-4">
          {/* Avatar */}
          <div
            className="relative flex-shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-lg"
            style={{ background: `linear-gradient(135deg, ${style.accent}88, ${style.accent}44)`, border: `1.5px solid ${style.accent}55` }}
          >
            {initials}
            {/* Online indicator */}
            <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-400 border-2 border-slate-900 flex items-center justify-center">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            </span>
          </div>

          {/* Name & role */}
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold text-base leading-tight">{session.recruiterName}</p>
            <p className="text-slate-300 text-xs mt-0.5 truncate">{session.recruiterRole ?? 'Senior Recruiter'}</p>
            {session.recruiterTeam && (
              <p className="text-slate-400 text-xs mt-0.5 truncate">{session.recruiterTeam}</p>
            )}
          </div>

          {/* Company badge */}
          <span className={`shrink-0 text-xs px-2.5 py-1 rounded-full border font-medium ${style.badge}`}>
            {company}
          </span>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {session.recruiterExp && (
            <div className="flex flex-col items-center gap-1 rounded-xl bg-slate-800/50 py-2 px-1">
              <Star className="h-3.5 w-3.5 text-amber-400" />
              <span className="text-xs text-white font-semibold">{session.recruiterExp}y</span>
              <span className="text-[10px] text-slate-500">Exp</span>
            </div>
          )}
          <div className="flex flex-col items-center gap-1 rounded-xl bg-slate-800/50 py-2 px-1">
            <Users className="h-3.5 w-3.5 text-violet-400" />
            <span className="text-xs text-white font-semibold">350+</span>
            <span className="text-[10px] text-slate-500">Hired</span>
          </div>
          <div className="flex flex-col items-center gap-1 rounded-xl bg-slate-800/50 py-2 px-1">
            <Shield className="h-3.5 w-3.5 text-emerald-400" />
            <span className="text-xs text-white font-semibold">4.9</span>
            <span className="text-[10px] text-slate-500">Rating</span>
          </div>
        </div>

        {/* Personality & type */}
        <div className="flex items-center gap-2 flex-wrap">
          {session.personality && (
            <span className="flex items-center gap-1 text-xs bg-slate-800/60 text-slate-300 px-2.5 py-1 rounded-full border border-slate-700/50">
              <span>{getPersonalityIcon(session.personality)}</span>
              {session.personality}
            </span>
          )}
          {session.interviewType && (
            <span className="flex items-center gap-1 text-xs bg-slate-800/60 text-slate-300 px-2.5 py-1 rounded-full border border-slate-700/50">
              <Briefcase className="h-3 w-3" />
              {session.interviewType}
            </span>
          )}
          {session.difficulty && (
            <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${
              ['Hard','Staff','Principal'].includes(session.difficulty)
                ? 'bg-red-500/20 text-red-300 border-red-500/30'
                : ['Medium','Mid','Senior'].includes(session.difficulty)
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
            }`}>
              {session.difficulty}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function LobbyPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // --- State ---
  const [cameraStatus, setCameraStatus] = useState<CheckStatus>('checking');
  const [micStatus, setMicStatus] = useState<CheckStatus>('checking');
  const [micVolume, setMicVolume] = useState<number>(0);
  const [speaker, setSpeaker] = useState<SpeakerState>({ status: 'idle', awaitingConfirm: false });
  const [internet, setInternet] = useState<InternetState>({ status: 'checking', mbps: null });
  const [session, setSession] = useState<SessionData | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);

  // --- Fetch session ---
  useEffect(() => {
    if (!id) return;
    interviewService
      .getSession(id)
      .then((data) => setSession(data))
      .catch(() => setSession(null))
      .finally(() => setSessionLoading(false));
  }, [id]);

  // --- Request camera + mic permissions ---
  useEffect(() => {
    let cancelled = false;

    async function requestPermissions() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        setCameraStatus('granted');
        setMicStatus('granted');
      } catch {
        if (!cancelled) { setCameraStatus('denied'); setMicStatus('denied'); }
      }
    }

    requestPermissions();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // --- Mic volume analyzer ---
  useEffect(() => {
    if (micStatus !== 'granted' || !streamRef.current) return;
    let audioCtx: AudioContext | null = null;
    let animationFrameId: number;

    try {
      audioCtx = new AudioContext();
      const analyser = audioCtx.createAnalyser();
      const source = audioCtx.createMediaStreamSource(streamRef.current);
      source.connect(analyser);
      analyser.fftSize = 256;
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const tick = () => {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) sum += dataArray[i]!;
        const avg = sum / bufferLength;
        setMicVolume(Math.min(100, Math.round((avg / 128) * 100)));
        animationFrameId = requestAnimationFrame(tick);
      };
      tick();
    } catch (err) {
      console.error('Mic analyser error:', err);
    }

    return () => {
      cancelAnimationFrame(animationFrameId);
      audioCtx?.close();
    };
  }, [micStatus]);

  // --- Internet speed ---
  useEffect(() => {
    checkInternetSpeed()
      .then((mbps) => setInternet({ status: mbps >= 1 ? 'granted' : 'warning', mbps }))
      .catch(() => setInternet({ status: 'warning', mbps: null }));
  }, []);

  // --- Speaker ---
  const handleTestSpeaker = useCallback(() => {
    setSpeaker({ status: 'checking', awaitingConfirm: false });
    playSpeakerBeep();
    setTimeout(() => setSpeaker({ status: 'idle', awaitingConfirm: true }), 700);
  }, []);

  const handleSpeakerConfirm = useCallback((heard: boolean) => {
    setSpeaker({ status: heard ? 'granted' : 'warning', awaitingConfirm: false });
  }, []);

  // --- Derived readiness ---
  const coreReady = cameraStatus === 'granted' && micStatus === 'granted';
  const allReady = coreReady && speaker.status === 'granted' && internet.status === 'granted';
  const partialReady = coreReady && !allReady;

  const handleEnter = () => {
    if (coreReady) navigate(`/interview/${id}/room`);
  };

  // ---------------------------------------------------------------------------
  // Detail nodes
  // ---------------------------------------------------------------------------

  const cameraDetail = cameraStatus === 'denied' ? (
    <p className="text-xs text-red-400 px-4 py-1">Enable camera in browser settings and reload.</p>
  ) : null;

  const micDetail = micStatus === 'denied' ? (
    <p className="text-xs text-red-400 px-4 py-1">Enable microphone in browser settings and reload.</p>
  ) : micStatus === 'granted' ? (
    <div className="px-4 py-2">
      <MicVolumeBar volume={micVolume} />
      <p className="text-[10px] text-slate-500 mt-1">Speak to test microphone — {micVolume}%</p>
    </div>
  ) : null;

  const speakerDetail = (
    <div className="px-4 py-1 flex flex-col gap-2">
      {!speaker.awaitingConfirm && speaker.status !== 'granted' && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleTestSpeaker}
          disabled={speaker.status === 'checking'}
          className="w-fit border-slate-600 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs"
        >
          {speaker.status === 'checking' ? (
            <><Loader2 className="h-3 w-3 animate-spin" />Playing…</>
          ) : (
            <><Volume2 className="h-3 w-3" />Test Speaker</>
          )}
        </Button>
      )}
      {speaker.awaitingConfirm && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2">
          <span className="text-xs text-slate-300">Did you hear the test sound?</span>
          <Button size="sm" variant="outline" onClick={() => handleSpeakerConfirm(true)}
            className="h-6 px-2 text-xs border-emerald-600 bg-emerald-950/30 text-emerald-400 hover:bg-emerald-900/40">Yes</Button>
          <Button size="sm" variant="outline" onClick={() => handleSpeakerConfirm(false)}
            className="h-6 px-2 text-xs border-red-700 bg-red-950/30 text-red-400 hover:bg-red-900/40">No</Button>
        </motion.div>
      )}
      {speaker.status === 'warning' && (
        <p className="text-xs text-amber-400">Check your system audio settings and try again.</p>
      )}
    </div>
  );

  const internetDetail = (() => {
    if (internet.status === 'checking') return null;
    if (internet.mbps !== null) {
      return internet.status === 'granted'
        ? <p className="text-xs text-emerald-400 px-4 py-1">Good connection — {internet.mbps} Mbps</p>
        : <p className="text-xs text-amber-400 px-4 py-1">Connection may be slow — {internet.mbps} Mbps</p>;
    }
    return <p className="text-xs text-amber-400 px-4 py-1">Could not measure speed. Proceed with caution.</p>;
  })();

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 lg:p-8">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-6xl"
      >
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300 text-xs font-medium mb-4">
            <span className="h-1.5 w-1.5 rounded-full bg-violet-400 animate-pulse" />
            Pre-Interview Setup
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Interview Lobby</h1>
          <p className="mt-2 text-slate-400 text-sm max-w-md mx-auto">
            Make sure your camera, microphone, and speaker are working before you enter.
          </p>
        </div>

        {/* 3-column layout on large screens */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── Col 1: Device Checks ── */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            <Card className="bg-slate-900 border-slate-700/60 shadow-xl h-full">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold text-slate-100">System Checks</CardTitle>
                <p className="text-xs text-slate-500">Camera & mic are required to proceed.</p>
              </CardHeader>
              <CardContent className="flex flex-col gap-2.5">
                <CheckRow icon={<Camera className="h-4 w-4" />} label="Camera" status={cameraStatus} detail={cameraDetail} />
                <CheckRow icon={<Mic className="h-4 w-4" />} label="Microphone" status={micStatus} detail={micDetail} />
                <CheckRow icon={<Volume2 className="h-4 w-4" />} label="Speaker" status={speaker.status} detail={speakerDetail} />
                <CheckRow icon={<Wifi className="h-4 w-4" />} label="Internet Speed" status={internet.status} detail={internetDetail} />

                <div className="border-t border-slate-700/50 my-1" />

                <AnimatePresence>
                  {partialReady && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }} className="overflow-hidden"
                    >
                      <div className="flex items-start gap-2 rounded-xl bg-amber-950/30 border border-amber-700/40 px-3 py-2">
                        <Info className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
                        <p className="text-xs text-amber-300">
                          Camera & mic ready. Speaker/internet incomplete — you can still proceed.
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <Button
                  onClick={handleEnter}
                  disabled={!coreReady}
                  size="lg"
                  className={`mt-1 w-full font-semibold transition-all duration-300 ${
                    allReady
                      ? 'bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-900/40'
                      : coreReady
                      ? 'bg-slate-700 hover:bg-slate-600 text-slate-100'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  {coreReady ? (
                    <>Enter Interview <ArrowRight className="h-4 w-4" /></>
                  ) : (
                    <><Loader2 className="h-4 w-4 animate-spin" />Checking permissions…</>
                  )}
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          {/* ── Col 2: Camera Preview ── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="flex flex-col gap-4"
          >
            <Card className="bg-slate-900 border-slate-700/60 shadow-xl overflow-hidden flex-1">
              <CardContent className="p-0 h-full">
                <div className="relative bg-slate-800" style={{ aspectRatio: '16/9' }}>
                  <video
                    ref={videoRef} autoPlay muted playsInline
                    className={`w-full h-full object-cover transition-opacity duration-500 ${cameraStatus === 'granted' ? 'opacity-100' : 'opacity-0'}`}
                  />
                  <AnimatePresence>
                    {cameraStatus !== 'granted' && (
                      <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-800"
                      >
                        {cameraStatus === 'checking' ? (
                          <><Loader2 className="h-10 w-10 text-violet-400 animate-spin" />
                          <p className="text-sm text-slate-400">Requesting camera access…</p></>
                        ) : (
                          <><div className="rounded-full bg-red-950/40 p-4"><Camera className="h-10 w-10 text-red-400" /></div>
                          <p className="text-sm text-slate-400">Camera access denied</p></>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {cameraStatus === 'granted' && (
                    <>
                      <div className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-full bg-black/60 backdrop-blur-sm px-2.5 py-1">
                        <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                        <span className="text-xs text-white font-medium">Live</span>
                      </div>
                      {/* Mic level overlay at bottom */}
                      <div className="absolute bottom-3 right-3 flex items-center gap-2 rounded-full bg-black/60 backdrop-blur-sm px-3 py-1">
                        <Mic className="h-3 w-3 text-emerald-400" />
                        <div className="flex items-end gap-0.5 h-4">
                          {Array.from({ length: 8 }).map((_, i) => (
                            <div
                              key={i}
                              className={`w-0.5 rounded-sm transition-all duration-75 ${
                                micVolume > (i / 8) * 100 ? 'bg-emerald-400' : 'bg-slate-600'
                              }`}
                              style={{ height: `${40 + (i % 2) * 30}%` }}
                            />
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Session info mini */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Role', value: session?.role ?? '—' },
                { label: 'Type', value: session?.interviewType ?? '—' },
                { label: 'Questions', value: session?.questionCount?.toString() ?? '—' },
              ].map((item) => (
                <div key={item.label} className="rounded-xl bg-slate-900 border border-slate-700/60 p-3 text-center">
                  <p className="text-[10px] text-slate-500 mb-0.5">{item.label}</p>
                  <p className="text-xs font-semibold text-slate-200 truncate">{item.value}</p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* ── Col 3: Recruiter Profile ── */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="flex flex-col gap-4"
          >
            {/* Recruiter card */}
            <Card className="bg-slate-900 border-slate-700/60 shadow-xl">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-violet-400" />
                  <CardTitle className="text-base font-semibold text-slate-100">Your Recruiter</CardTitle>
                </div>
                <p className="text-xs text-slate-500">Assigned based on your target company</p>
              </CardHeader>
              <CardContent className="pt-0">
                <RecruiterCard session={session} loading={sessionLoading} />
              </CardContent>
            </Card>

            {/* Tips card */}
            <Card className="bg-slate-900 border-slate-700/60 shadow-xl flex-1">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold text-slate-100">Quick Tips</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5">
                {[
                  { emoji: '🎤', tip: 'Speak clearly and at a comfortable pace.' },
                  { emoji: '👀', tip: 'Maintain eye contact with the camera lens.' },
                  { emoji: '🧠', tip: 'Think out loud — show your reasoning process.' },
                  { emoji: '⏱️', tip: 'Keep answers concise: 2–3 mins per question.' },
                ].map(({ emoji, tip }) => (
                  <div key={tip} className="flex items-start gap-3 rounded-xl bg-slate-800/50 px-3 py-2.5">
                    <span className="text-base leading-none mt-0.5">{emoji}</span>
                    <p className="text-xs text-slate-300 leading-relaxed">{tip}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
