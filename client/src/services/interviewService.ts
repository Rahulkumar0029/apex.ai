import api from '@/lib/axios';

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

export interface SessionData {
  id: string;
  userId: string;
  role: string;
  experienceYears: number;
  difficulty: 'Intern' | 'Fresher' | 'Junior' | 'Mid' | 'Senior' | 'Staff' | 'Principal';
  interviewType: 'HR' | 'Technical' | 'SystemDesign' | 'Behavioral' | 'Coding' | 'Managerial' | 'Mixed';
  techStack: string[];
  language: string;
  status: 'configured' | 'active' | 'completed' | 'interrupted';
  questionCount: number;
  createdAt: string;
  completedAt?: string;
  company?: string;
  personality?: string;
  recruiterName?: string;
  recruiterRole?: string;
  recruiterTeam?: string;
  recruiterExp?: number;
}

export const interviewService = {
  createSession: (config: SessionConfig): Promise<{ sessionId: string }> =>
    api.post<{ sessionId: string }>('/interview/create', config).then((r) => r.data),

  startSession: (sessionId: string): Promise<void> =>
    api.post(`/interview/${sessionId}/start`).then(() => undefined),

  endSession: (sessionId: string): Promise<void> =>
    api.post(`/interview/${sessionId}/end`).then(() => undefined),

  getSession: (sessionId: string): Promise<SessionData> =>
    api.get<SessionData>(`/interview/${sessionId}`).then((r) => r.data),
};

export default interviewService;
