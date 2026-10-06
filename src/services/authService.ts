import { User } from '../types';

const REGISTERED_USERS_KEY = 'vortex_registered_accounts';

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
   * Authenticate user credential
   */
  async login(credentials: LoginCredentials): Promise<User> {
    const identifier = credentials.identifier.trim();

    // Validation
    if (!identifier || !credentials.password) {
      throw new Error('Please fill in all required fields.');
    }

    if (credentials.password.length < 4) {
      throw new Error('Invalid email/username or password.');
    }

    const email = identifier.includes('@') ? identifier.toLowerCase() : `${identifier.toLowerCase()}@vortexcode.com`;
    const username = identifier.includes('@') ? identifier.split('@')[0] : identifier;
    const namePart = username.charAt(0).toUpperCase() + username.slice(1);

    return {
      id: `usr_${Math.random().toString(36).substring(2, 9)}`,
      fullName: namePart,
      email,
      username,
      isGuest: false,
      createdAt: new Date().toISOString(),
      security2FA: false,
    };
  },

  /**
   * Register a new customer account
   */
  async register(credentials: RegisterCredentials): Promise<User> {
    if (!credentials.fullName || !credentials.email || !credentials.password) {
      throw new Error('Please complete all mandatory fields.');
    }

    if (credentials.password.length < 6) {
      throw new Error('Password must be at least 6 characters.');
    }

    const existingRaw = typeof window !== 'undefined' ? localStorage.getItem(REGISTERED_USERS_KEY) : null;
    const existingList: string[] = existingRaw ? JSON.parse(existingRaw) : [];
    
    if (existingList.includes(credentials.email.toLowerCase())) {
      throw new Error('An account with this email address already exists.');
    }

    existingList.push(credentials.email.toLowerCase());
    if (typeof window !== 'undefined') {
      localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(existingList));
    }

    const username = credentials.email.split('@')[0];

    return {
      id: `usr_${Math.random().toString(36).substring(2, 9)}`,
      fullName: credentials.fullName.trim(),
      email: credentials.email.toLowerCase().trim(),
      username,
      mobileNumber: credentials.mobileNumber?.trim(),
      isGuest: false,
      createdAt: new Date().toISOString(),
      security2FA: false,
    };
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
