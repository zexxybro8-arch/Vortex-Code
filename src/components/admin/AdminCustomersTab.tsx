import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../services/api';
import {
  Users,
  Search,
  Filter,
  ArrowUpDown,
  ShieldCheck,
  Mail,
  Calendar,
  Key,
  ShoppingBag,
  ExternalLink,
  Power,
  CheckCircle2,
  AlertCircle,
  X,
  UserCheck,
  TrendingUp,
} from 'lucide-react';

export const AdminCustomersTab: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<string>('newest');

  // Selected User for Details Modal
  const [selectedUserIdentifier, setSelectedUserIdentifier] = useState<string | null>(null);
  const [userDetails, setUserDetails] = useState<any | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState<boolean>(false);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.getAdminUsers();
      if (Array.isArray(res)) {
        setUsers(res);
      }
    } catch (err) {
      console.error('Failed to fetch admin users:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleFetchDetails = async (identifier: string) => {
    setSelectedUserIdentifier(identifier);
    setIsLoadingDetails(true);
    setUserDetails(null);
    try {
      const res = await api.getAdminUserDetails(identifier);
      if (res && res.profile) {
        setUserDetails(res);
      }
    } catch (err) {
      console.error('Failed to fetch user details:', err);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleToggleStatus = async (customerId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';
    try {
      const res = await api.updateUserStatus(customerId, newStatus);
      if (res && res.success) {
        await fetchUsers();
        if (selectedUserIdentifier === customerId && userDetails) {
          setUserDetails((prev: any) => ({
            ...prev,
            profile: { ...prev.profile, status: newStatus },
          }));
        }
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  // Filter & Search logic
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      (u.customerId || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.fullName || '').toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (statusFilter === 'ACTIVE' && u.status !== 'ACTIVE') return false;
    if (statusFilter === 'DISABLED' && u.status !== 'DISABLED') return false;
    if (statusFilter === 'HAS_PURCHASES' && u.successfulOrders <= 0) return false;
    if (statusFilter === 'NO_PURCHASES' && u.successfulOrders > 0) return false;

    return true;
  });

  // Sorting logic
  const sortedUsers = [...filteredUsers].sort((a, b) => {
    if (sortBy === 'newest') {
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    }
    if (sortBy === 'oldest') {
      return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
    }
    if (sortBy === 'purchases') {
      return b.successfulOrders - a.successfulOrders;
    }
    if (sortBy === 'spending') {
      return b.totalSpent - a.totalSpent;
    }
    if (sortBy === 'login') {
      return new Date(b.lastLogin || 0).getTime() - new Date(a.lastLogin || 0).getTime();
    }
    return 0;
  });

  // Summary Metrics
  const totalUsers = users.length;
  const activeUsers = users.filter((u) => u.status === 'ACTIVE').length;
  const usersWithPurchases = users.filter((u) => u.successfulOrders > 0).length;
  const totalCodesSold = users.reduce((sum, u) => sum + (u.codesPurchased || 0), 0);

  return (
    <div className="space-y-6">
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Registered Customers & Users Management</h1>
          <p className="text-xs text-slate-400">View registered customer profiles, customer IDs, purchase statistics, and manage account status.</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1 shadow-md">
          <div className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">TOTAL USERS</div>
          <div className="text-2xl font-black text-white font-mono">{totalUsers}</div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-emerald-500/30 space-y-1 shadow-md">
          <div className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-wider">ACTIVE USERS</div>
          <div className="text-2xl font-black text-emerald-400 font-mono">{activeUsers}</div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1 shadow-md">
          <div className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">USERS WITH PURCHASES</div>
          <div className="text-2xl font-black text-white font-mono">{usersWithPurchases}</div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1 shadow-md">
          <div className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-wider">TOTAL CODES SOLD</div>
          <div className="text-2xl font-black text-emerald-400 font-mono">{totalCodesSold}</div>
        </div>
      </div>

      {/* Search, Filter & Sort Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-lg">
        
        {/* Search input */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Customer ID (VC-XXXXXX), Email, or Name..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400 font-mono"
          />
        </div>

        {/* Filters & Sorting */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-slate-300 focus:outline-none focus:border-emerald-400 cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="DISABLED">Disabled</option>
            <option value="HAS_PURCHASES">Has Purchases</option>
            <option value="NO_PURCHASES">No Purchases</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-slate-300 focus:outline-none focus:border-emerald-400 cursor-pointer"
          >
            <option value="newest">Sort: Newest First</option>
            <option value="oldest">Sort: Oldest First</option>
            <option value="purchases">Sort: Most Purchases</option>
            <option value="spending">Sort: Highest Spending</option>
            <option value="login">Sort: Last Login</option>
          </select>
        </div>

      </div>

      {/* Users Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl overflow-x-auto">
        <table className="w-full text-left text-xs font-sans">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400 uppercase font-mono text-[10px]">
              <th className="py-3 px-3">Customer ID</th>
              <th className="py-3 px-3">Customer Name</th>
              <th className="py-3 px-3">Email Address</th>
              <th className="py-3 px-3">Provider</th>
              <th className="py-3 px-3">Joined Date</th>
              <th className="py-3 px-3">Last Login</th>
              <th className="py-3 px-3">Codes Purchased</th>
              <th className="py-3 px-3">Orders</th>
              <th className="py-3 px-3">Total Spent</th>
              <th className="py-3 px-3">Status</th>
              <th className="py-3 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80">
            {isLoading ? (
              <tr>
                <td colSpan={11} className="py-12 text-center text-slate-500 font-mono text-xs">
                  Loading customer database...
                </td>
              </tr>
            ) : sortedUsers.length === 0 ? (
              <tr>
                <td colSpan={11} className="py-12 text-center text-slate-500 font-sans text-xs">
                  No registered customer profiles match your filter criteria.
                </td>
              </tr>
            ) : (
              sortedUsers.map((cust) => (
                <tr key={cust.id} className="hover:bg-slate-950/50 transition-colors">
                  <td className="py-3.5 px-3 font-mono font-bold text-emerald-400">{cust.customerId}</td>
                  <td className="py-3.5 px-3 font-bold text-white">{cust.fullName}</td>
                  <td className="py-3.5 px-3 text-slate-300 font-mono">{cust.email}</td>
                  <td className="py-3.5 px-3">
                    <span className="px-2 py-0.5 rounded bg-slate-950 text-slate-300 font-mono text-[10px] border border-slate-800">
                      {cust.provider}
                    </span>
                  </td>
                  <td className="py-3.5 px-3 text-slate-400 font-mono">{cust.joinedDate}</td>
                  <td className="py-3.5 px-3 text-slate-400 font-mono">{cust.lastLogin}</td>
                  <td className="py-3.5 px-3 font-mono text-white font-bold">{cust.codesPurchased}</td>
                  <td className="py-3.5 px-3 font-mono text-emerald-300 font-bold">{cust.successfulOrders}</td>
                  <td className="py-3.5 px-3 font-mono text-emerald-400 font-bold">₹{cust.totalSpentRupees}</td>
                  <td className="py-3.5 px-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                        cust.status === 'ACTIVE'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}
                    >
                      {cust.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-3 text-right space-x-2">
                    <button
                      onClick={() => handleFetchDetails(cust.customerId || cust.id)}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[10px] font-bold font-mono transition-all cursor-pointer"
                    >
                      View Details
                    </button>
                    <button
                      onClick={() => handleToggleStatus(cust.customerId || cust.id, cust.status)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold font-mono transition-colors cursor-pointer ${
                        cust.status === 'ACTIVE'
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30 hover:bg-rose-500/20'
                          : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20'
                      }`}
                    >
                      {cust.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* User Details Modal / Drawer */}
      {selectedUserIdentifier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-black text-white">Customer Profile & Purchase History</h2>
                  <p className="text-[11px] text-slate-400 font-mono">ID: {selectedUserIdentifier}</p>
                </div>
              </div>

              <button
                onClick={() => {
                  setSelectedUserIdentifier(null);
                  setUserDetails(null);
                }}
                className="p-2 rounded-xl bg-slate-900 text-slate-400 hover:text-white border border-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {isLoadingDetails ? (
                <div className="py-16 text-center font-mono text-xs text-slate-400 animate-pulse">
                  Loading customer details and secure order history...
                </div>
              ) : userDetails ? (
                <>
                  {/* Profile & Stats Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
                      <div className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-widest">CUSTOMER PROFILE</div>
                      <div className="space-y-1 text-xs font-mono">
                        <div>Name: <strong className="text-white">{userDetails.profile.fullName}</strong></div>
                        <div>Email: <strong className="text-white">{userDetails.profile.email}</strong></div>
                        <div>Customer ID: <strong className="text-emerald-400">{userDetails.profile.customerId}</strong></div>
                        <div>Internal ID: <span className="text-slate-400">{userDetails.profile.id}</span></div>
                        <div>Provider: <span className="text-slate-300">{userDetails.profile.provider}</span></div>
                        <div>Status: <span className={userDetails.profile.status === 'ACTIVE' ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>{userDetails.profile.status}</span></div>
                      </div>
                    </div>

                    <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
                      <div className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-widest">PURCHASE STATISTICS</div>
                      <div className="space-y-1.5 text-xs font-mono">
                        <div>Successful Orders: <strong className="text-white">{userDetails.statistics.successfulOrders}</strong></div>
                        <div>Codes Purchased: <strong className="text-white">{userDetails.statistics.codesPurchased}</strong></div>
                        <div>Total Spent: <strong className="text-emerald-400">₹{userDetails.statistics.totalSpent}</strong></div>
                        <div>Joined: <span className="text-slate-400">{userDetails.profile.createdAt?.substring(0, 10)}</span></div>
                      </div>
                    </div>
                  </div>

                  {/* Purchase History List */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
                      SUCCESSFUL PURCHASE HISTORY ({userDetails.orders.length})
                    </h3>

                    {userDetails.orders.length === 0 ? (
                      <div className="p-8 text-center bg-slate-950 rounded-2xl border border-slate-800 text-xs text-slate-500 font-mono">
                        This customer has no successful redemptions yet.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {userDetails.orders.map((ord: any) => (
                          <div key={ord.id} className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2 font-mono text-xs">
                            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                              <span className="text-emerald-400 font-bold">{ord.orderNumber}</span>
                              <span className="text-slate-400">{ord.createdAt?.substring(0, 16).replace('T', ' ')}</span>
                            </div>

                            <div className="flex items-center justify-between">
                              <span className="text-white font-bold">{ord.productName}</span>
                              <span className="text-emerald-300">Paid: ₹{ord.amount}</span>
                            </div>

                            <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800 flex items-center justify-between">
                              <span className="text-slate-300 tracking-widest font-bold">{ord.deliveredCode || '•••• •••• •••• ••••'}</span>
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                ✓ {ord.paymentStatus} / {ord.deliveryStatus}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="py-16 text-center text-rose-400 text-xs font-mono">
                  Failed to load user details.
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 bg-slate-950 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => {
                  setSelectedUserIdentifier(null);
                  setUserDetails(null);
                }}
                className="py-2 px-5 bg-slate-900 hover:bg-slate-800 text-slate-200 rounded-xl text-xs font-bold border border-slate-800 cursor-pointer"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
