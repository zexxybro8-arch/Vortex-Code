import { AdminUser } from '../types/admin';

export interface AdminLoginCredentials {
  identifier: string;
  password: string;
}

export const adminAuthService = {
  /**
   * Authenticate Admin User
   * Separated logic ready for REST/Firebase API backend connection
   */
  async login(credentials: AdminLoginCredentials): Promise<AdminUser> {
    await new Promise((resolve) => setTimeout(resolve, 600));

    const identifier = credentials.identifier.trim().toLowerCase();

    if (!identifier || !credentials.password) {
      throw new Error('Please enter admin email/username and password.');
    }

    if (credentials.password.length < 4) {
      throw new Error('Invalid administrative credentials.');
    }

    return {
      id: `adm_${Math.random().toString(36).substring(2, 8)}`,
      name: identifier === 'sagar551' ? 'SAGAR551 (Admin)' : 'Vortex Administrator',
      email: identifier.includes('@') ? identifier : `${identifier}@vortexcode.com`,
      role: 'Super Admin',
      lastLogin: new Date().toISOString().replace('T', ' ').substring(0, 16),
    };
  },
};
