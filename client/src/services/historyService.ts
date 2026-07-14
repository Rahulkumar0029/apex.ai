import api from '@/lib/axios';

export const historyService = {
  getHistory: (params?: {
    page?: number;
    search?: string;
    difficulty?: string;
    interviewType?: string;
    startDate?: string;
    endDate?: string;
  }) => api.get('/history', { params }).then((r) => r.data),

  deleteSession: (id: string) => api.delete(`/history/${id}`),
};

export default historyService;
