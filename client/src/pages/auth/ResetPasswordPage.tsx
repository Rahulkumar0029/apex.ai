import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldCheck, Lock } from 'lucide-react';
import axios from 'axios';

import { authService } from '@/services/authService';
import { toast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const schema = z
  .object({
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type FormValues = z.infer<typeof schema>;

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormValues) => {
    if (!token) {
      toast({
        title: 'Error',
        description: 'Reset token is missing from the link.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await authService.resetPassword(token, data.password);
      toast({
        title: 'Password Updated',
        description: 'Your password has been changed successfully. You can now login.',
      });
      navigate('/login');
    } catch (err) {
      if (axios.isAxiosError(err)) {
        toast({
          title: 'Reset Failed',
          description: err.response?.data?.message || 'The reset link is invalid or has expired.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Something went wrong',
          description: 'Please try again later.',
          variant: 'destructive',
        });
      }
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-950 px-4 text-gray-100 relative">
      <div className="absolute top-0 left-0 w-96 h-96 bg-violet-600/10 rounded-full blur-[128px] pointer-events-none" />
      
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="w-full max-w-md relative z-10"
      >
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-violet-500/10 flex items-center justify-center mb-3">
              <ShieldCheck className="h-6 w-6 text-violet-400" />
            </div>
            <CardTitle className="text-2xl font-bold text-white">Reset Password</CardTitle>
            <CardDescription className="text-gray-400 mt-1">
              Enter a new secure password for your account.
            </CardDescription>
          </CardHeader>

          <CardContent>
            {!token ? (
              <div className="text-center p-4 border border-dashed border-red-900/40 rounded-xl bg-red-950/10 text-red-400 text-sm">
                Invalid reset link. Please check your email or request a new password reset.
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
                {/* New Password */}
                <div className="space-y-1.5">
                  <Label htmlFor="password">New Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      className="bg-gray-800 border-gray-700 text-gray-100 pl-10 focus-visible:ring-violet-500"
                      {...register('password')}
                    />
                  </div>
                  {errors.password && (
                    <p className="text-xs text-red-400 mt-1">{errors.password.message}</p>
                  )}
                </div>

                {/* Confirm Password */}
                <div className="space-y-1.5">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="••••••••"
                      className="bg-gray-800 border-gray-700 text-gray-100 pl-10 focus-visible:ring-violet-500"
                      {...register('confirmPassword')}
                    />
                  </div>
                  {errors.confirmPassword && (
                    <p className="text-xs text-red-400 mt-1">{errors.confirmPassword.message}</p>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-gradient-to-r from-violet-600 to-violet-700 hover:from-violet-500 hover:to-violet-600 text-white font-semibold py-2.5 rounded-xl transition-all shadow-lg shadow-violet-600/10"
                >
                  {isSubmitting ? 'Updating password…' : 'Update Password'}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
