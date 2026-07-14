import { create } from 'zustand';

interface Question {
  id: string;
  text: string;
  audioUrl: string;
  orderIndex: number;
  timeLimit: number;
}

type ThinkingState = 'analyzing' | 'followup' | 'feedback' | null;

interface InterviewState {
  sessionId: string | null;
  currentQuestion: Question | null;
  transcript: string;
  thinkingState: ThinkingState;
  timer: number;
  questionCount: number;
  currentQuestionIndex: number;
  setSessionId: (id: string) => void;
  setQuestion: (q: Question) => void;
  setThinking: (state: ThinkingState) => void;
  appendTranscript: (chunk: string) => void;
  setTranscript: (t: string) => void;
  setTimer: (t: number) => void;
  decrementTimer: () => void;
  setQuestionCount: (n: number) => void;
  incrementQuestionIndex: () => void;
  reset: () => void;
}

export const useInterviewStore = create<InterviewState>()((set) => ({
  sessionId: null,
  currentQuestion: null,
  transcript: '',
  thinkingState: null,
  timer: 120,
  questionCount: 0,
  currentQuestionIndex: 0,
  setSessionId: (sessionId) => set({ sessionId }),
  setQuestion: (currentQuestion) =>
    set({ currentQuestion, transcript: '', timer: currentQuestion.timeLimit }),
  setThinking: (thinkingState) => set({ thinkingState }),
  appendTranscript: (chunk) => set((s) => ({ transcript: s.transcript + chunk })),
  setTranscript: (transcript) => set({ transcript }),
  setTimer: (timer) => set({ timer }),
  decrementTimer: () => set((s) => ({ timer: Math.max(0, s.timer - 1) })),
  setQuestionCount: (questionCount) => set({ questionCount }),
  incrementQuestionIndex: () =>
    set((s) => ({ currentQuestionIndex: s.currentQuestionIndex + 1 })),
  reset: () =>
    set({
      sessionId: null,
      currentQuestion: null,
      transcript: '',
      thinkingState: null,
      timer: 120,
      questionCount: 0,
      currentQuestionIndex: 0,
    }),
}));
