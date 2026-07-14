export interface QuestionContext {
  role: string;
  experienceYears: number;
  difficulty: string;
  interviewType: string;
  techStack: string[];
  language: string;
  previousTranscript?: string;
  questionIndex: number;
  company?: string;
  personality?: string;
  recruiterName?: string;
  recruiterRole?: string;
  recruiterTeam?: string;
  recruiterExp?: number;
  currentPhase?: string;
  history?: { question: string; answer: string }[];
  stressLevel?: number;
  candidateName?: string;
}

export interface Evaluation {
  technicalScore: number;        // 0-100
  communicationScore: number;    // 0-100
  problemSolvingScore: number;   // 0-100
  grammarScore: number;          // 0-100
  strengths: string[];
  improvements: string[];
  aiNotes?: string;              // hidden recruiter notebook notes
}

export interface EvalContext {
  role: string;
  difficulty: string;
  questionText: string;
  language: string;
  company?: string;
  personality?: string;
  currentPhase?: string;
  stressLevel?: number;
}

export interface IAIEngine {
  generateQuestion(context: QuestionContext): Promise<{ text: string }>;
  evaluateResponse(transcript: string, context: EvalContext): Promise<Evaluation>;
  generateDashboardSuggestions(recentRoles: string[], avgScores: number[]): Promise<string[]>;
}
