import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';

function parseJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export default function AuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const setUser = useAuthStore((s) => s.setUser);

  useEffect(() => {
    const token = searchParams.get('token');
    const refresh = searchParams.get('refresh');

    if (!token) {
      navigate('/login', { replace: true });
      return;
    }

    const payload = parseJwtPayload(token);

    if (!payload) {
      navigate('/login', { replace: true });
      return;
    }

    const user = {
      id: (payload.sub ?? payload.id ?? '') as string,
      email: (payload.email ?? '') as string,
      displayName: (payload.displayName ?? payload.name ?? '') as string,
      photoUrl: (payload.photoUrl ?? payload.picture) as string | undefined,
      planId: (payload.planId ?? 'free') as string,
    };

    setUser(user, token);

    // Store refresh token in localStorage if provided
    if (refresh) {
      localStorage.setItem('apex-refresh-token', refresh);
    }

    navigate('/dashboard', { replace: true });
  }, [searchParams, navigate, setUser]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-muted-foreground">Signing you in…</p>
    </div>
  );
}
