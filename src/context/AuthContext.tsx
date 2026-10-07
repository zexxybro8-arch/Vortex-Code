import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, AuthView, OrderItem, RedeemCode } from '../types';
import { authService, LoginCredentials, RegisterCredentials } from '../services/authService';
import { api } from '../services/api';

interface ToastInfo {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface AuthContextType {
  user: User | null;
  currentView: AuthView;
  setCurrentView: (view: AuthView) => void;
  login: (credentials: LoginCredentials) => Promise<void>;
  loginWithGoogle: (idToken: string) => Promise<void>;
  register: (credentials: RegisterCredentials) => Promise<void>;
  requestPasswordReset: (email: string) => Promise<string>;
  logout: () => void;
  isLoading: boolean;
  toasts: ToastInfo[];
  addToast: (type: 'success' | 'error' | 'info', message: string) => void;
  removeToast: (id: string) => void;
  
  // Orders & Store state
  orders: OrderItem[];
  refreshCustomerOrders: () => Promise<void>;
  availableCodes: RedeemCode[];
  refreshAvailableCodes: () => Promise<void>;
  claimCode: (codeId: string) => Promise<boolean>;
  redeemPromoCode: (promoInput: string) => boolean;
  authRequiredModalOpen: boolean;
  setAuthRequiredModalOpen: (open: boolean) => void;
  restrictedActionAttempted: string;
  triggerAuthRequired: (actionName: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Function to map pathname to AuthView
const getInitialView = (): AuthView => {
  if (typeof window === 'undefined') return 'dashboard';
  const path = window.location.pathname.toLowerCase();
  if (path === '/landing') return 'landing';
  if (path === '/login') return 'login';
  if (path === '/register') return 'register';
  if (path === '/forgot-password') return 'forgot-password';
  if (path === '/vault') return 'vault';
  if (path === '/order-lookup') return 'order-lookup';
  return 'dashboard';
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('vortex_logged_user');
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch {
          return null;
        }
      }
    }
    return null;
  });
  const [currentView, setCurrentViewInternal] = useState<AuthView>(getInitialView);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [toasts, setToasts] = useState<ToastInfo[]>([]);

  // Function to set view and sync URL path
  const setCurrentView = (view: AuthView) => {
    setCurrentViewInternal(view);
    if (typeof window !== 'undefined') {
      let path = '/';
      if (view === 'login') path = '/login';
      else if (view === 'register') path = '/register';
      else if (view === 'forgot-password') path = '/forgot-password';
      else if (view === 'dashboard' || view === 'store') path = '/dashboard';
      else if (view === 'vault') path = '/vault';
      else if (view === 'order-lookup') path = '/order-lookup';

      if (window.location.pathname !== path) {
        window.history.pushState({ view }, '', path);
      }
    }
  };

  // Sync with browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      setCurrentViewInternal(getInitialView());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);
  
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [availableCodes, setAvailableCodes] = useState<RedeemCode[]>([]);

  const refreshCustomerOrders = useCallback(async () => {
    try {
      if (!user) {
        setOrders([]);
        return;
      }
      const apiOrders = await api.getOrders(user.email);
      if (apiOrders) {
        const mappedOrders: OrderItem[] = apiOrders.map((o) => ({
          id: o.id,
          orderNumber: o.orderNumber,
          codeTitle: o.productName,
          priceRupees: Number(o.amount),
          rewardValueRupees: Number(o.amount * 15),
          codeValue: Number(o.amount * 15),
          redeemCode: o.paymentStatus === 'PAID' && o.deliveredCode ? o.deliveredCode : 'PAYMENT PENDING',
          pin: o.paymentStatus === 'PAID' ? o.deliveredPin || '' : '',
          category: 'GOOGLE PLAY',
          purchaseDate: o.createdAt ? o.createdAt.substring(0, 16).replace('T', ' ') : new Date().toISOString().substring(0, 16),
          status: o.paymentStatus === 'PAID' && o.deliveryStatus === 'DELIVERED' ? 'Completed' : 'Processing',
          paymentMethod: o.paymentMethod || 'Direct Payment Gateway',
        }));
        setOrders(mappedOrders);
      }
    } catch (err) {
      console.error('Failed to load orders from database in AuthContext:', err);
    }
  }, [user]);

  const refreshAvailableCodes = useCallback(async () => {
    try {
      const apiCodes = await api.getRedeemCodes(undefined, 'UNUSED');
      if (apiCodes) {
        const mappedCodes: RedeemCode[] = apiCodes.map((c) => ({
          id: c.id,
          productId: c.productId,
          denomination: c.denomination || '₹100',
          priceRupees: Number(c.price || 100),
          title: c.productName || 'Google Play Recharge Code',
          category: c.category || 'DIGITAL REWARDS',
          value: Number(c.rewardValue || (c.price ? c.price * 15 : 1500)),
          code: c.codeMasked || 'CSGY AGTS **** ****',
          codeMasked: c.codeMasked || 'CSGY AGTS **** ****',
          pin: c.pin || '9842',
          status: 'available',
          image: 'https://i.ibb.co/s9Gk3DMm/IMG-20261007-001618-366.png',
          description: `Instant ${c.denomination || '₹100'} digital voucher code with encrypted key and security PIN.`,
        }));
        setAvailableCodes(mappedCodes);
      }
    } catch (err) {
      console.error('Failed to load available codes from database in AuthContext:', err);
    }
  }, []);

  useEffect(() => {
    refreshCustomerOrders();
    refreshAvailableCodes();
    // Continuous sync every 3 seconds
    const interval = setInterval(() => {
      refreshCustomerOrders();
      refreshAvailableCodes();
    }, 3000);
    return () => clearInterval(interval);
  }, [refreshCustomerOrders, refreshAvailableCodes]);
  
  const [authRequiredModalOpen, setAuthRequiredModalOpen] = useState<boolean>(false);
  const [restrictedActionAttempted, setRestrictedActionAttempted] = useState<string>('');

  const addToast = (type: 'success' | 'error' | 'info', message: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      removeToast(id);
    }, 4500);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const triggerAuthRequired = (actionName: string) => {
    setRestrictedActionAttempted(actionName);
    setAuthRequiredModalOpen(true);
  };

  const login = async (credentials: LoginCredentials) => {
    setIsLoading(true);
    try {
      const loggedUser = await authService.login(credentials);
      setUser(loggedUser);
      if (typeof window !== 'undefined') {
        localStorage.setItem('vortex_logged_user', JSON.stringify(loggedUser));
      }
      setCurrentView('dashboard');
      addToast('success', `Welcome back, ${loggedUser.fullName}! Access granted to Vortex Vault.`);
    } catch (err: any) {
      addToast('error', err.message || 'Authentication failed. Check your credentials.');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithGoogle = async (idToken: string) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/google-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({ idToken }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Google login failed.');
      }
      
      const loggedUser = data.user;
      setUser(loggedUser);
      if (typeof window !== 'undefined') {
        localStorage.setItem('vortex_logged_user', JSON.stringify(loggedUser));
      }
      setCurrentView('dashboard');
      addToast('success', `Welcome, ${loggedUser.fullName}! Signed in securely via Google.`);
    } catch (err: any) {
      addToast('error', err.message || 'Google authentication cancelled or failed.');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (credentials: RegisterCredentials) => {
    setIsLoading(true);
    try {
      const newUser = await authService.register(credentials);
      setUser(newUser);
      if (typeof window !== 'undefined') {
        localStorage.setItem('vortex_logged_user', JSON.stringify(newUser));
      }
      setCurrentView('dashboard');
      addToast('success', 'Account created successfully! Welcome to Vortex Code Store.');
    } catch (err: any) {
      addToast('error', err.message || 'Registration failed. Please try again.');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const requestPasswordReset = async (email: string): Promise<string> => {
    setIsLoading(true);
    try {
      const res = await authService.requestPasswordReset(email);
      addToast('success', res.message);
      return res.message;
    } catch (err: any) {
      addToast('error', err.message || 'Could not send reset link.');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('vortex_logged_user');
    }
    setCurrentView('login');
    addToast('info', 'You have been signed out safely.');
  };

  const claimCode = async (codeId: string): Promise<boolean> => {
    if (!user) {
      triggerAuthRequired('Claim Digital Code & Access Private Orders');
      return false;
    }

    try {
      const res = await api.purchaseProduct({
        codeId,
        customerName: user.fullName || user.username || 'Customer',
        customerEmail: user.email,
        paymentMethod: 'Direct Payment Gateway',
      });

      if (res && res.success) {
        addToast('success', `🎉 Code claimed successfully! Secret key stored in your Orders & Vault.`);
        await refreshCustomerOrders();
        await refreshAvailableCodes();
        return true;
      }
      return false;
    } catch (err: any) {
      addToast('error', err.message || 'Failed to claim code.');
      return false;
    }
  };

  const redeemPromoCode = (promoInput: string): boolean => {
    const clean = promoInput.trim().toUpperCase();
    if (!clean) {
      addToast('error', 'Please enter a valid voucher code string.');
      return false;
    }

    if (!user) {
      triggerAuthRequired('Redeem Voucher & Store Key in Account');
      return false;
    }

    addToast('info', `Voucher [${clean}] processed. No promotional credits attached to this voucher code.`);
    return true;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        currentView,
        setCurrentView,
        login,
        loginWithGoogle,
        register,
        requestPasswordReset,
        logout,
        isLoading,
        toasts,
        addToast,
        removeToast,
        orders,
        refreshCustomerOrders,
        availableCodes,
        refreshAvailableCodes,
        claimCode,
        redeemPromoCode,
        authRequiredModalOpen,
        setAuthRequiredModalOpen,
        restrictedActionAttempted,
        triggerAuthRequired,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
