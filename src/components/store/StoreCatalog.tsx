import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Ticket, Search, Zap, ShieldCheck, Key, Gift, ArrowRight, Sparkles, Copy, Check } from 'lucide-react';

export const StoreCatalog: React.FC = () => {
  const { availableCodes, claimCode, redeemPromoCode, user, triggerAuthRequired, setCurrentView } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [promoInput, setPromoInput] = useState('');
  const [claimedCardId, setClaimedCardId] = useState<string | null>(null);

  const categories = ['All', 'Gaming', 'ESports', 'Streaming', 'Software'];

  const filteredCodes = availableCodes.filter((item) => {
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleClaim = async (codeId: string) => {
    const success = await claimCode(codeId);
    if (success) {
      setClaimedCardId(codeId);
      setTimeout(() => setClaimedCardId(null), 3000);
    }
  };

  const handlePromoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (promoInput.trim()) {
      const success = redeemPromoCode(promoInput);
      if (success) setPromoInput('');
    }
  };

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-10">
      
      {/* Hero Banner Section */}
      <div className="relative rounded-3xl overflow-hidden bg-slate-900 border border-slate-800 shadow-2xl p-6 sm:p-10">
        
        {/* Background Image Layer */}
        <div className="absolute inset-0 z-0 opacity-25 mix-blend-luminosity">
          <img
            src="/src/assets/images/store_hero_vault_1791305976557.jpg"
            alt="Vortex Store Digital Vault"
            className="w-full h-full object-cover"
          />
        </div>

        {/* Ambient Overlay */}
        <div className="absolute inset-0 z-0 bg-gradient-to-r from-slate-950 via-slate-950/90 to-transparent"></div>

        <div className="relative z-10 max-w-2xl space-y-4">
          
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold uppercase tracking-wider">
            <Zap className="w-3.5 h-3.5" />
            <span>Instant Fulfillment Store</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
            Digital Redeem Codes & <span className="text-emerald-400">Vault Keys</span>
          </h1>

          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            Browse authentic game vouchers, subscription passes, and software keys. Authenticate your account to store claimed codes safely in your private encrypted vault.
          </p>

          {/* Interactive Code Redemption Input Bar */}
          <div className="pt-2">
            <form onSubmit={handlePromoSubmit} className="flex flex-col sm:flex-row gap-2 max-w-xl">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-emerald-400">
                  <Gift className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={promoInput}
                  onChange={(e) => setPromoInput(e.target.value)}
                  placeholder="Enter Voucher Code (e.g. VORTEX2026)"
                  className="w-full pl-10 pr-4 py-3 bg-slate-950/90 border border-emerald-500/40 rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 font-mono"
                />
              </div>

              <button
                type="submit"
                className="py-3 px-6 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-lg shadow-emerald-500/20 whitespace-nowrap flex items-center justify-center gap-2 cursor-pointer shrink-0"
              >
                <Sparkles className="w-4 h-4" />
                <span>Redeem Voucher</span>
              </button>
            </form>
          </div>

        </div>
      </div>

      {/* Catalog Filters & Search Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        
        {/* Interactive Segmented Filter Tabs (functional buttons) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/20'
                  : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Search input */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search catalog codes..."
            className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

      </div>

      {/* Product Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {filteredCodes.map((card) => {
          const isJustClaimed = claimedCardId === card.id;

          return (
            <div
              key={card.id}
              className="group bg-slate-900 border border-slate-800 hover:border-emerald-500/50 rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-emerald-950/30 flex flex-col justify-between"
            >
              <div>
                {/* Card Image Container */}
                <div className="relative h-44 overflow-hidden bg-slate-950">
                  <img
                    src={card.image}
                    alt={card.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent"></div>
                  
                  {/* Category text separator (no static pill badge spam) */}
                  <div className="absolute top-3 left-3 text-[11px] font-mono text-emerald-300 font-semibold uppercase tracking-wider bg-slate-950/80 backdrop-blur-md px-2.5 py-1 rounded-lg border border-emerald-500/30">
                    {card.category}
                  </div>

                  <div className="absolute bottom-3 right-3 text-lg font-bold font-mono text-white bg-slate-950/90 px-3 py-1 rounded-xl border border-slate-800 shadow-md">
                    ${card.value}
                  </div>
                </div>

                {/* Card Details */}
                <div className="p-5 space-y-2">
                  <h3 className="text-base font-bold text-white tracking-tight group-hover:text-emerald-400 transition-colors">
                    {card.title}
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">
                    {card.description}
                  </p>
                </div>
              </div>

              {/* Action Area */}
              <div className="p-5 pt-0 space-y-3">
                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-800/80">
                  <span className="flex items-center gap-1 text-emerald-400/90">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Instant Fulfillment</span>
                  </span>
                  <span className="font-mono text-slate-400">Stock Verified</span>
                </div>

                <button
                  onClick={() => handleClaim(card.id)}
                  className={`w-full py-2.5 px-4 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    isJustClaimed
                      ? 'bg-emerald-500 text-slate-950'
                      : 'bg-slate-800 hover:bg-emerald-400 text-slate-200 hover:text-slate-950 border border-slate-700 hover:border-emerald-400 shadow-md'
                  }`}
                >
                  {isJustClaimed ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Claimed to Vault!</span>
                    </>
                  ) : (
                    <>
                      <Key className="w-4 h-4 text-emerald-400 group-hover:text-slate-950 transition-colors" />
                      <span>Claim Digital Key (${card.value})</span>
                    </>
                  )}
                </button>
              </div>

            </div>
          );
        })}
      </div>

      {/* Sign in prompt banner at bottom if not logged in */}
      {!user && (
        <div className="p-6 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center sm:text-left">
            <h4 className="text-sm font-bold text-amber-200">Account Access</h4>
            <p className="text-xs text-slate-300">
              Sign in or register an account to permanently store claimed code keys in your private vault.
            </p>
          </div>
          <button
            onClick={() => setCurrentView('login')}
            className="py-2.5 px-5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-xl transition-all shrink-0 cursor-pointer"
          >
            Sign In Now
          </button>
        </div>
      )}

    </div>
  );
};
