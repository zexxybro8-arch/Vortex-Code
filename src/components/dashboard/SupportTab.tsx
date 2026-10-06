import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { MessageSquare, Search, HelpCircle, Send, CheckCircle2, ShieldCheck, ChevronDown, ChevronUp } from 'lucide-react';

export const SupportTab: React.FC = () => {
  const { addToast, orders } = useAuth();

  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketMessage, setTicketMessage] = useState('');
  const [ticketOrderId, setTicketOrderId] = useState('');
  const [isSent, setIsSent] = useState(false);

  // Order lookup state
  const [lookupId, setLookupId] = useState('');
  const [foundOrder, setFoundOrder] = useState<any | null>(null);
  const [searched, setSearched] = useState(false);

  // FAQ accordion open states
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const faqs = [
    {
      q: 'How fast will I receive my digital code key after purchasing?',
      a: 'All digital code keys are generated instantly upon order confirmation. They appear immediately in your "My Orders & Vault" tab with copyable code keys and PINs.',
    },
    {
      q: 'What should I do if my code key is marked as invalid on the target platform?',
      a: 'Ensure you have copied all 16 digits without extra spaces. If the issue persists, submit a support ticket above with your Order ID, and our verification team will re-validate the code key within 15 minutes.',
    },
    {
      q: 'Are these digital redeem vouchers authentic and verified?',
      a: 'Yes, 100% of vouchers delivered through Vortex Code are sourced directly through authorized publisher channels and protected with end-to-end 256-bit SSL encryption.',
    },
    {
      q: 'Can I request a refund if I haven\'t revealed the secret code key?',
      a: 'Unrevealed code keys in your Vault can be reviewed for store credit within 24 hours of purchase. Contact customer support with your Order ID for instant assistance.',
    },
  ];

  const handleTicketSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketSubject.trim() || !ticketMessage.trim()) {
      addToast('error', 'Please complete the subject and message fields.');
      return;
    }
    setIsSent(true);
    addToast('success', 'Support ticket submitted! Ticket ID #TK-2026-9921 generated.');
  };

  const handleLookup = (e: React.FormEvent) => {
    e.preventDefault();
    setSearched(true);
    const clean = lookupId.trim().toUpperCase();
    if (!clean) {
      setFoundOrder(null);
      return;
    }
    const match = orders.find(
      (o) => o.orderNumber.toUpperCase() === clean || o.id.toUpperCase() === clean
    );
    setFoundOrder(match || null);
  };

  return (
    <div className="space-y-10 max-w-5xl mx-auto">
      
      {/* Support Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-2 relative overflow-hidden neon-glow">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold uppercase tracking-wider">
          <HelpCircle className="w-3.5 h-3.5" />
          <span>Vortex Customer Support</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Help & Order Assistance
        </h2>
        <p className="text-sm text-slate-300">
          Search order status, submit a support ticket, or view answers to common redemption questions.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Support Ticket Form */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
          <div className="flex items-center gap-2 text-white font-bold text-base border-b border-slate-800 pb-3">
            <MessageSquare className="w-4 h-4 text-emerald-400" />
            <span>Submit a Support Ticket</span>
          </div>

          {!isSent ? (
            <form onSubmit={handleTicketSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                  Order ID (Optional)
                </label>
                <input
                  type="text"
                  value={ticketOrderId}
                  onChange={(e) => setTicketOrderId(e.target.value)}
                  placeholder="e.g. VRX-2026-8801"
                  className="w-full py-2.5 px-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                  Subject
                </label>
                <input
                  type="text"
                  value={ticketSubject}
                  onChange={(e) => setTicketSubject(e.target.value)}
                  placeholder="e.g. Help with code redemption"
                  className="w-full py-2.5 px-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-400"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                  Message Details
                </label>
                <textarea
                  value={ticketMessage}
                  onChange={(e) => setTicketMessage(e.target.value)}
                  rows={4}
                  placeholder="Describe your question or issue in detail..."
                  className="w-full py-2.5 px-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-400"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>Submit Ticket</span>
              </button>
            </form>
          ) : (
            <div className="text-center py-6 space-y-3">
              <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto border border-emerald-400/40">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">Ticket Submitted Successfully</h3>
              <p className="text-xs text-slate-300">
                Our support team is reviewing ticket <strong className="text-emerald-400 font-mono">#TK-2026-9921</strong>. We will respond via account email shortly.
              </p>
              <button
                onClick={() => setIsSent(false)}
                className="text-xs text-emerald-400 hover:underline pt-2 block mx-auto"
              >
                Submit another request
              </button>
            </div>
          )}
        </div>

        {/* Quick Order Lookup Tool */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
          <div className="flex items-center gap-2 text-white font-bold text-base border-b border-slate-800 pb-3">
            <Search className="w-4 h-4 text-emerald-400" />
            <span>Quick Order Lookup</span>
          </div>

          <form onSubmit={handleLookup} className="flex gap-2">
            <input
              type="text"
              value={lookupId}
              onChange={(e) => setLookupId(e.target.value)}
              placeholder="Enter Order ID (e.g. VRX-2026-8801)"
              className="flex-1 py-2.5 px-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-emerald-400"
            />
            <button
              type="submit"
              className="py-2.5 px-4 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-xs rounded-xl transition-all shrink-0 cursor-pointer"
            >
              Search
            </button>
          </form>

          {searched && (
            <div className="pt-2">
              {foundOrder ? (
                <div className="p-3.5 rounded-xl bg-slate-950 border border-emerald-500/30 text-xs space-y-1.5 font-mono">
                  <div className="flex items-center justify-between">
                    <span className="text-emerald-400 font-bold">{foundOrder.orderNumber}</span>
                    <span className="text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded">
                      {foundOrder.status}
                    </span>
                  </div>
                  <div className="text-white font-sans font-semibold">{foundOrder.codeTitle}</div>
                  <div className="text-slate-400 text-[11px] font-sans">
                    Date: {foundOrder.purchaseDate}
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400 text-center">
                  No order found matching "<span className="font-mono text-amber-400">{lookupId}</span>".
                </div>
              )}
            </div>
          )}

          <div className="pt-2 border-t border-slate-800 text-xs text-slate-400 space-y-2">
            <p className="font-semibold text-white">🔒 Secure Guarantee</p>
            <p className="text-[11px] leading-relaxed">
              All transactions are protected by 256-bit SSL encryption and backed by our instant delivery guarantee.
            </p>
          </div>
        </div>

      </div>

      {/* FAQ Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-emerald-400" />
          <span>Frequently Asked Questions</span>
        </h3>

        <div className="space-y-3">
          {faqs.map((faq, idx) => {
            const isOpen = openFaqIndex === idx;
            return (
              <div
                key={idx}
                className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden transition-all"
              >
                <button
                  onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                  className="w-full p-4 text-left font-bold text-xs sm:text-sm text-slate-200 hover:text-white flex items-center justify-between gap-3 cursor-pointer"
                >
                  <span>{faq.q}</span>
                  {isOpen ? (
                    <ChevronUp className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />
                  )}
                </button>

                {isOpen && (
                  <div className="px-4 pb-4 text-xs text-slate-400 leading-relaxed border-t border-slate-900 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};
