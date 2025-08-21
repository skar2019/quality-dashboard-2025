export interface IUser {
  id: string;
  email: string;
  userType: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ILoginCredentials {
  email: string;
  password: string;
}

export interface ILoginResponse {
  user: IUser;
  token: string;
}

export interface IAuthState {
  user: IUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
} 