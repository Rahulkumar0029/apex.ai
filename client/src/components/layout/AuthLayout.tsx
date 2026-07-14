import { Outlet } from 'react-router-dom';

export function AuthLayout() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Apex.ai</h1>
        </div>
        <div className="rounded-2xl border border-border bg-card shadow-lg p-8">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

export default AuthLayout;
