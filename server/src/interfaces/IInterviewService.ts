export interface SessionConfig {
  role: string;
  experienceYears: number;
  difficulty: 'Intern' | 'Fresher' | 'Junior' | 'Mid' | 'Senior' | 'Staff' | 'Principal';
  interviewType: 'HR' | 'Technical' | 'SystemDesign' | 'Behavioral' | 'Coding' | 'Managerial' | 'Mixed';
  techStack: string[];
  language: string;
  questionCount?: number;
  company?: string;
  personality?: string;
}

export interface IInterviewService {
  createSession(userId: string, config: SessionConfig): Promise<{ sessionId: string; status: string }>;
  startSession(sessionId: string, userId: string): Promise<void>;
  endSession(sessionId: string, userId: string): Promise<void>;
  checkPlanLimits(userId: string): Promise<void>;
}
