import api from '@/lib/axios';

export const analyticsService = {
  getAnalytics: (params?: { startDate?: string; endDate?: string }) =>
    api.get('/analytics', { params }).then((r) => r.data),

  getDashboard: () => api.get('/dashboard').then((r) => r.data),
};

export default analyticsService;
