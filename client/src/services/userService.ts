import api from '@/lib/axios';

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  photoUrl?: string;
  college?: string;
  yearsOfExperience: number;
  skills: string[];
  resumeUrl?: string;
  planId: string;
  googleId?: string;
  notificationPrefs: Record<string, boolean>;
  themePreference: string;
  aiVoicePreference: string;
  language: string;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateProfileDto {
  displayName?: string;
  college?: string;
  yearsOfExperience?: number;
  skills?: string[];
  resumeUrl?: string;
}

export interface UpdateSettingsDto {
  themePreference?: string;
  notificationPrefs?: Record<string, boolean>;
  aiVoicePreference?: string;
}

export const userService = {
  /** GET /users/me — fetch the authenticated user's full profile */
  getMe: (): Promise<UserProfile> =>
    api.get<UserProfile>('/users/me').then((r) => r.data),

  /** PUT /users/profile — update display name, college, experience, skills, resume */
  updateProfile: (payload: UpdateProfileDto): Promise<UserProfile> =>
    api.put<UserProfile>('/users/profile', payload).then((r) => r.data),

  /** POST /users/photo — upload profile photo as multipart/form-data */
  uploadPhoto: (file: File): Promise<UserProfile> => {
    const form = new FormData();
    form.append('photo', file);
    return api
      .post<UserProfile>('/users/photo', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data);
  },

  /** PUT /users/settings — update theme, notifications, voice preference */
  updateSettings: (payload: UpdateSettingsDto): Promise<UserProfile> =>
    api.put<UserProfile>('/users/settings', payload).then((r) => r.data),

  /** DELETE /users/account — permanently delete the account and all associated data */
  deleteAccount: (): Promise<void> =>
    api.delete('/users/account').then(() => undefined),
};

export default userService;
