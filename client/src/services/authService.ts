import api from '@/lib/axios';

export interface RegisterDto {
  email: string;
  password: string;
  displayName: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken?: string;
  user: {
    id: string;
    email: string;
    displayName: string;
    photoUrl?: string;
    planId: string;
  };
}

export const authService = {
  register: (payload: RegisterDto): Promise<AuthResponse> =>
    api.post<AuthResponse>('/auth/register', payload).then((r) => r.data),

  login: (payload: LoginDto): Promise<AuthResponse> =>
    api.post<AuthResponse>('/auth/login', payload).then((r) => r.data),

  logout: (): Promise<void> =>
    api.post('/auth/logout').then(() => undefined),

  refreshToken: (): Promise<AuthResponse> =>
    api.post<AuthResponse>('/auth/refresh').then((r) => r.data),

  forgotPassword: (email: string): Promise<void> =>
    api.post('/auth/forgot-password', { email }).then(() => undefined),

  resetPassword: (token: string, password: string): Promise<void> =>
    api.post('/auth/reset-password', { token, password }).then(() => undefined),

  googleLogin: (code: string): Promise<AuthResponse> =>
    api.post<AuthResponse>('/auth/google/callback', { code }).then((r) => r.data),
};

export default authService;
