import { createBrowserRouter, Navigate } from 'react-router-dom';
import { RequireAuth } from '@/components/layout/RequireAuth';
import { AppLayout } from '@/components/layout/AppLayout';
import { AuthLayout } from '@/components/layout/AuthLayout';

import LandingPage from '@/pages/LandingPage';
import LoginPage from '@/pages/auth/LoginPage';
import RegisterPage from '@/pages/auth/RegisterPage';
import ForgotPasswordPage from '@/pages/auth/ForgotPasswordPage';
import ResetPasswordPage from '@/pages/auth/ResetPasswordPage';
import AuthCallbackPage from '@/pages/auth/AuthCallbackPage';
import SharedReportPage from '@/pages/SharedReportPage';
import DashboardPage from '@/pages/DashboardPage';
import CreateInterviewPage from '@/pages/interview/CreateInterviewPage';
import LobbyPage from '@/pages/interview/LobbyPage';
import RoomPage from '@/pages/interview/RoomPage';
import ReportPage from '@/pages/ReportPage';
import AnalyticsPage from '@/pages/AnalyticsPage';
import HistoryPage from '@/pages/HistoryPage';
import ProfilePage from '@/pages/ProfilePage';
import SettingsPage from '@/pages/SettingsPage';

export function createRouter() {
  return createBrowserRouter([
    // Public routes
    { path: '/', element: <LandingPage /> },
    {
      element: <AuthLayout />,
      children: [
        { path: '/login', element: <LoginPage /> },
        { path: '/register', element: <RegisterPage /> },
        { path: '/forgot-password', element: <ForgotPasswordPage /> },
        { path: '/reset-password', element: <ResetPasswordPage /> },
      ],
    },
    { path: '/auth/callback', element: <AuthCallbackPage /> },
    { path: '/shared/:token', element: <SharedReportPage /> },

    // Protected routes
    {
      element: <RequireAuth />,
      children: [
        {
          element: <AppLayout />,
          children: [
            { path: '/dashboard', element: <DashboardPage /> },
            { path: '/interview/new', element: <CreateInterviewPage /> },
            { path: '/interview/:id/lobby', element: <LobbyPage /> },
            { path: '/interview/:id/room', element: <RoomPage /> },
            { path: '/report/:id', element: <ReportPage /> },
            { path: '/analytics', element: <AnalyticsPage /> },
            { path: '/history', element: <HistoryPage /> },
            { path: '/profile', element: <ProfilePage /> },
            { path: '/settings', element: <SettingsPage /> },
          ],
        },
      ],
    },

    // Catch-all
    { path: '*', element: <Navigate to="/" replace /> },
  ]);
}
