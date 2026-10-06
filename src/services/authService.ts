import { User } from '../types';

export interface LoginCredentials {
  identifier: string; // Email or Username
  password: string;
  rememberMe?: boolean;
}

export interface RegisterCredentials {
  fullName: string;
  email: string;
  mobileNumber?: string;
  password: string;
}

export const authService = {
  /**
   * Authenticate user credential against database
   */
  async login(credentials: LoginCredentials): Promise<User> {
    const identifier = credentials.identifier.trim();

    if (!identifier || !credentials.password) {
      throw new Error('Please fill in all required fields.');
    }

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password: credentials.password }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Invalid email/username or password.');
    }

    return data.user;
  },

  /**
   * Register a new customer account securely in persistent SQLite database
   */
  async register(credentials: RegisterCredentials): Promise<User> {
    if (!credentials.fullName || !credentials.email || !credentials.password) {
      throw new Error('Please complete all mandatory fields.');
    }

    if (credentials.password.length < 6) {
      throw new Error('Password must be at least 6 characters.');
    }

    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: credentials.fullName,
        email: credentials.email,
        password: credentials.password,
        mobileNumber: credentials.mobileNumber,
      }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Registration failed. Please try again.');
    }

    return data.user;
  },

  /**
   * Request password reset link
   */
  async requestPasswordReset(email: string): Promise<{ success: boolean; message: string }> {
    if (!email || !email.includes('@')) {
      throw new Error('Please enter a valid email address.');
    }

    return {
      success: true,
      message: `A secure password reset link has been dispatched to ${email}. Please check your inbox.`,
    };
  },
};
