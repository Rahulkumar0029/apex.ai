export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface UserSummary {
  id: string;
  email: string;
  displayName: string;
}

export interface RegisterResult extends TokenPair {
  user: UserSummary;
}

export interface RegisterDto {
  email: string;
  password: string;
  displayName: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface IAuthService {
  register(dto: RegisterDto): Promise<RegisterResult>;
  login(dto: LoginDto): Promise<RegisterResult>;
  logout(refreshToken: string): Promise<void>;
  refresh(refreshToken: string): Promise<TokenPair>;
  forgotPassword(email: string): Promise<void>;
  resetPassword(token: string, newPassword: string): Promise<void>;
  handleGoogleCallback(code: string): Promise<TokenPair>;
}
