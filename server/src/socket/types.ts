export interface ServerToClientEvents {
  startInterview: (data: {
    sessionId: string;
    questionCount: number;
    recruiterName: string;
    recruiterRole: string;
    recruiterTeam: string;
    recruiterExp: number;
    company: string;
    personality: string;
  }) => void;
  question: (data: {
    questionId: string;
    text: string;
    audioUrl: string;
    orderIndex: number;
    timeLimit: number;
    currentPhase: string;
    currentTopic?: string;
    difficulty?: string;
  }) => void;
  thinking: (data: { state: 'analyzing' | 'followup' | 'feedback' | null }) => void;
  nextQuestion: (data: {
    questionId: string;
    text: string;
    audioUrl: string;
    orderIndex: number;
    timeLimit: number;
    currentPhase: string;
    currentTopic?: string;
    difficulty?: string;
  }) => void;
  report: (data: { reportId: string }) => void;
  error: (data: { message: string; code: string }) => void;
  transcriptChunk: (data: {
    text: string;
    confidence: number;
    isFinal: boolean;
  }) => void;
}

export interface ClientToServerEvents {
  ready: (data: { sessionId: string }) => void;
  answer: (data: {
    sessionId: string;
    questionId: string;
    transcript: string;
    durationSeconds: number;
  }) => void;
  endInterview: (data: { sessionId: string }) => void;
}
