import api from '@/lib/axios';

export interface ReportData {
  id: string;
  sessionId: string;
  overallScore: number;
  technicalScore: number;
  communicationScore: number;
  confidenceScore: number;
  grammarScore: number;
  problemSolvingScore: number;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  shareToken?: string;
  shareTokenExpiresAt?: string;
  createdAt: string;
  timeline?: Array<{
    question: string;
    response: string;
    scores: {
      technicalScore: number;
      communicationScore: number;
      problemSolvingScore: number;
      grammarScore: number;
      strengths: string[];
      improvements: string[];
    };
  }>;
}

export const reportService = {
  getReport: (sessionId: string): Promise<ReportData> =>
    api.get<ReportData>(`/report/${sessionId}`).then((r) => r.data),

  downloadPDF: (reportId: string): Promise<Blob> =>
    api
      .get(`/report/${reportId}/pdf`, { responseType: 'blob' })
      .then((r) => r.data as Blob),

  shareReport: (reportId: string): Promise<{ shareUrl: string }> =>
    api
      .post<{ shareUrl: string }>(`/report/${reportId}/share`)
      .then((r) => r.data),
};

export default reportService;
