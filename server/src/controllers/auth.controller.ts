import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/AuthService';
import { config } from '../config';

export async function registerController(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await authService.register(req.body);
    res.status(201).json(result);
  } catch (err) { next(err); }
}

export async function loginController(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await authService.login(req.body);
    res.status(200).json(result);
  } catch (err) { next(err); }
}

export async function logoutController(req: Request, res: Response, next: NextFunction) {
  try {
    const refreshToken = req.body.refreshToken ?? req.cookies?.refreshToken;
    await authService.logout(refreshToken ?? '');
    res.status(204).send();
  } catch (err) { next(err); }
}

export async function refreshController(req: Request, res: Response, next: NextFunction) {
  try {
    const refreshToken = req.body.refreshToken ?? req.cookies?.refreshToken;
    if (!refreshToken) {
      res.status(401).json({ error: 'UNAUTHORIZED', message: 'Refresh token required.' });
      return;
    }
    const result = await authService.refresh(refreshToken);
    res.status(200).json(result);
  } catch (err) { next(err); }
}

export function googleRedirectController(_req: Request, res: Response) {
  const params = new URLSearchParams({
    client_id: config.GOOGLE_CLIENT_ID,
    redirect_uri: config.GOOGLE_CALLBACK_URL,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
  });
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
}

export async function googleCallbackController(req: Request, res: Response, next: NextFunction) {
  try {
    const code = req.query.code as string;
    const result = await authService.handleGoogleCallback(code);
    // Redirect to frontend with token (frontend reads from URL or stores in state)
    res.redirect(`${config.CLIENT_URL}/auth/callback?token=${result.accessToken}&refresh=${result.refreshToken}`);
  } catch (err) { next(err); }
}

export async function forgotPasswordController(req: Request, res: Response, next: NextFunction) {
  try {
    await authService.forgotPassword(req.body.email);
    res.status(200).json({ message: 'If that email exists, a reset link has been sent.' });
  } catch (err) { next(err); }
}

export async function resetPasswordController(req: Request, res: Response, next: NextFunction) {
  try {
    await authService.resetPassword(req.body.token, req.body.password);
    res.status(200).json({ message: 'Password updated successfully.' });
  } catch (err) { next(err); }
}
