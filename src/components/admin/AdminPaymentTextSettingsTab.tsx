import React, { useState, useEffect } from 'react';
import { 
  Sparkles, Ticket, Save, RotateCcw, Eye, ChevronDown, ChevronUp, 
  CheckCircle, AlertCircle, Info, Settings, HelpCircle, Copy 
} from 'lucide-react';
import { api } from '../../services/api';

export const AdminPaymentTextSettingsTab: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'diamonds' | 'redeem'>('diamonds');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  // Default settings for Diamonds
  const defaultDiamondsSettings = {
    categoryHeading: 'DIAMONDS RECHARGE',
    productSelectionHeading: 'SELECT DIAMOND PACK',
    productNameLabel: 'Diamond Pack',
    diamondQuantityLabel: 'Diamonds',
    priceLabel: 'Price',
    selectedProductMessage: 'Selected Diamond Package for Free Fire',
    outOfStockMessage: 'OUT OF STOCK',
    disabledProductMessage: 'CURRENTLY UNAVAILABLE',
    
    verificationHeading: 'PLAYER VERIFICATION',
    playerIdLabel: 'Free Fire Player UID',
    playerNameLabel: 'Player Nickname',
    verificationButtonText: 'VERIFY PLAYER UID',
    verificationLoadingMessage: 'Verifying Player UID with Game Server...',
    verificationSuccessfulMessage: 'Player Verified Successfully!',
    verificationFailedMessage: 'Player verification failed. Please check your UID.',
    invalidPlayerIdMessage: 'Invalid Game UID. Must be 5-15 digits.',
    verificationRequiredMessage: 'Please verify your Player UID before proceeding.',

    paymentSectionHeading: 'SECURE PAYMENT',
    paymentInstructions: 'Scan QR Code or pay via UPI. Payments are verified securely on backend.',
    selectedDiamondsSummaryLabel: 'Selected Package Summary',
    orderSummaryHeading: 'ORDER SUMMARY',
    productPriceLabel: 'Product Price',
    processingFeeLabel: 'Processing Fee',
    discountLabel: 'Discount',
    totalPayableLabel: 'TOTAL PAYABLE',
    payNowButtonText: 'PROCEED TO PAY',
    paymentProcessingMessage: 'Initializing Secure Payment Gateway...',
    paymentRedirectMessage: 'Redirecting to Payment Gateway...',

    paymentPendingHeading: 'PAYMENT PENDING',
    paymentPendingMessage: 'Waiting for payment confirmation from gateway...',
    paymentSuccessfulHeading: 'PAYMENT SUCCESSFUL!',
    paymentSuccessfulMessage: 'Your payment has been verified successfully.',
    paymentFailedHeading: 'PAYMENT FAILED',
    paymentFailedMessage: 'Payment transaction failed or was declined.',
    paymentCancelledMessage: 'Payment cancelled by user.',
    paymentVerificationMessage: 'Verifying payment cryptographic signature on backend...',
    paymentVerificationFailedMessage: 'Payment verification failed. Unverified signature.',

    deliveryNoticeHeading: 'DIAMONDS DELIVERY INSTRUCTIONS',
    englishDeliveryMessage: 'Diamonds will be credited directly to your Free Fire UID Mail Box within 5-15 minutes after payment verification.',
    hindiHinglishDeliveryMessage: 'Payment hone ke baad Diamonds aapke Free Fire Uid Mail Box me 5-15 minute me bhej diye jayenge.',
    deliveryTimeMessage: 'Estimated Delivery Time: 5 - 15 Minutes',
    deliveryProcessingMessage: 'Processing Diamond Transfer to UID...',
    deliverySuccessfulMessage: 'Diamonds Transferred Successfully to UID!',
    deliveryDelayedMessage: 'Delivery is taking longer than usual due to server load. Support is monitoring.',
    contactSupportMessage: 'If you face any issues, contact support with your Order ID.',

    successHeading: 'PURCHASE SUCCESSFUL!',
    successDescription: 'Your diamond top-up or order has been completed',
    deliveryDetailsHeading: 'ACCOUNT TRANSFER DETAILS',
    additionalInformation: 'Thank you for purchasing with Vortex Code!',
    copyButtonText: 'COPY DETAILS',
    continueButtonText: 'CONTINUE SHOPPING',
    closeButtonText: 'CLOSE',

    insufficientBalanceMessage: 'Insufficient wallet balance.',
    minimumPaymentMessage: 'Amount is below minimum payment threshold.',
    maximumPaymentMessage: 'Amount exceeds maximum limit.',
    invalidAmountMessage: 'Invalid payment amount.',
    networkErrorMessage: 'Network error connecting to payment server.',
    generalPaymentErrorMessage: 'An error occurred during payment processing.',
    retryPaymentButtonText: 'RETRY PAYMENT',
    returnToStoreButtonText: 'RETURN TO STORE',
  };

  // Default settings for Redeem Code
  const defaultRedeemSettings = {
    categoryHeading: 'GOOGLE PLAY REDEEM CODE',
    productSelectionHeading: 'SELECT RECHARGE AMOUNT',
    productNameLabel: 'Google Play Gift Code',
    productDescription: 'Instant digital delivery with secure PIN',
    priceLabel: 'Price',
    redeemValueLabel: 'Redeem Value',
    availableStockLabel: 'Available Stock',
    outOfStockMessage: 'OUT OF STOCK',
    disabledProductMessage: 'PRODUCT DISABLED',

    orderSummaryHeading: 'ORDER SUMMARY',
    selectedProductLabel: 'Selected Product',
    productPriceLabel: 'Product Price',
    processingFeeLabel: 'Processing Fee',
    discountLabel: 'Discount',
    totalPayableLabel: 'TOTAL PAYABLE',
    continueToPaymentButtonText: 'PROCEED TO PAYMENT',
    payNowButtonText: 'PAY NOW',
    paymentProcessingMessage: 'Processing payment request...',

    paymentPendingHeading: 'PAYMENT PENDING',
    paymentPendingMessage: 'Waiting for payment authorization...',
    paymentSuccessfulHeading: 'PAYMENT SUCCESSFUL!',
    paymentSuccessfulMessage: 'Payment verified successfully by backend.',
    paymentFailedHeading: 'PAYMENT FAILED',
    paymentFailedMessage: 'Payment failed or was canceled.',
    paymentCancelledMessage: 'Transaction canceled.',
    paymentVerificationMessage: 'Verifying payment status...',
    paymentVerificationFailedMessage: 'Payment verification failed.',

    deliveryHeading: 'REDEEM CODE DELIVERY',
    deliveryProcessingMessage: 'Generating secure code and PIN...',
    deliverySuccessfulMessage: 'Redeem code assigned securely!',
    codeAssignedMessage: 'Your unique code has been unlocked.',
    codeDeliveryFailedMessage: 'Code delivery failed. Contact support.',
    contactSupportMessage: 'Contact support if code is unassigned.',

    successHeading: 'PURCHASE SUCCESSFUL!',
    successDescription: 'Your payment has been verified successfully.',
    greenTickEnabled: true,
    codeSectionHeading: 'YOUR REDEEM CODE',
    codeLabel: 'Redeem Code',
    copyCodeButtonText: 'COPY CODE',
    codeCopiedConfirmationMessage: 'Redeem code copied to clipboard!',
    additionalSuccessMessage: 'Enjoy your Google Play credits!',
    doneButtonText: 'DONE',
    closeButtonText: 'CLOSE',

    outOfStockError: 'Selected code denomination is out of stock.',
    invalidOrderMessage: 'Invalid order reference.',
    paymentRetryMessage: 'Please retry your payment.',
    networkErrorMessage: 'Network error occurred.',
    generalPaymentErrorMessage: 'Payment gateway error.',
    returnToStoreButtonText: 'RETURN TO STORE',
    contactSupportButtonText: 'CONTACT SUPPORT',

    additionalPaymentInstructions: 'All sales are final upon code delivery.',
    additionalSuccessMessageText: 'Keep your code secure.',
    additionalDeliveryMessageText: 'Redeemable on Google Play Store.',
    optionalFooterMessage: 'Vortex Code Secure Delivery System',
  };

  const [diamondsSettings, setDiamondsSettings] = useState(defaultDiamondsSettings);
  const [redeemSettings, setRedeemSettings] = useState(defaultRedeemSettings);

  // Collapsible groups state
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    product: true,
    verification: false,
    payment: false,
    status: false,
    delivery: false,
    success: false,
    errors: false,
    custom: false,
  });

  const toggleGroup = (key: string) => {
    setOpenGroups(prev => ({ ...prev, [key]: !prev[key] }));
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const dData = await api.getCategoricalSettings('diamonds');
      if (dData && Object.keys(dData).length > 0) {
        setDiamondsSettings(prev => ({ ...prev, ...dData }));
      }

      const rData = await api.getCategoricalSettings('redeem');
      if (rData && Object.keys(rData).length > 0) {
        setRedeemSettings(prev => ({ ...prev, ...rData }));
      }
    } catch (err: any) {
      setNotification({ type: 'error', message: 'Failed to load settings from database.' });
    } finally {
      setIsLoading(false);
      setHasUnsavedChanges(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setNotification(null);
    try {
      if (activeSubTab === 'diamonds') {
        await api.updateCategoricalSettings('diamonds', diamondsSettings);
      } else {
        await api.updateCategoricalSettings('redeem', redeemSettings);
      }
      setNotification({ type: 'success', message: `${activeSubTab === 'diamonds' ? 'Diamonds' : 'Redeem Code'} payment and text settings saved successfully!` });
      setHasUnsavedChanges(false);
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Failed to save settings.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (window.confirm(`Are you sure you want to reset ${activeSubTab === 'diamonds' ? 'Diamonds' : 'Redeem Code'} settings to default?`)) {
      if (activeSubTab === 'diamonds') {
        setDiamondsSettings(defaultDiamondsSettings);
      } else {
        setRedeemSettings(defaultRedeemSettings);
      }
      setHasUnsavedChanges(true);
      setNotification({ type: 'success', message: 'Settings reset to default values. Click Save to persist.' });
    }
  };

  const updateField = (key: string, value: any) => {
    setHasUnsavedChanges(true);
    if (activeSubTab === 'diamonds') {
      setDiamondsSettings(prev => ({ ...prev, [key]: value }));
    } else {
      setRedeemSettings(prev => ({ ...prev, [key]: value }));
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      
      {/* HEADER & TABS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-3xl">
        <div>
          <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            <Settings className="w-6 h-6 text-emerald-400" />
            PAYMENT & TEXT CUSTOMIZATION
          </h2>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            Control customer-facing payment messages, notices, and popup labels separately for Diamonds and Redeem Code.
          </p>
        </div>

        {/* SUB-TABS */}
        <div className="flex gap-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
          <button
            onClick={() => { setActiveSubTab('diamonds'); setNotification(null); }}
            className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-xl text-xs font-bold font-mono transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'diamonds'
                ? 'bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            DIAMONDS SETTINGS
          </button>

          <button
            onClick={() => { setActiveSubTab('redeem'); setNotification(null); }}
            className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-xl text-xs font-bold font-mono transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'redeem'
                ? 'bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Ticket className="w-4 h-4" />
            REDEEM CODE SETTINGS
          </button>
        </div>
      </div>

      {/* NOTIFICATIONS & UNSAVED BAR */}
      {notification && (
        <div className={`p-4 rounded-2xl flex items-center gap-3 text-xs font-mono font-bold ${
          notification.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300' : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
        }`}>
          {notification.type === 'success' ? <CheckCircle className="w-5 h-5 shrink-0 text-emerald-400" /> : <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />}
          <span>{notification.message}</span>
        </div>
      )}

      {hasUnsavedChanges && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-between text-xs font-mono text-amber-300">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
            <span>You have unsaved changes in {activeSubTab === 'diamonds' ? 'Diamonds' : 'Redeem Code'} settings.</span>
          </div>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg transition-colors cursor-pointer"
          >
            Save Now
          </button>
        </div>
      )}

      {/* ACTION CONTROLS BAR */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 border border-slate-800 p-4 rounded-2xl">
        <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
          <Info className="w-4 h-4 text-emerald-400" />
          <span>Active Category: <strong className="text-emerald-400 uppercase">{activeSubTab === 'diamonds' ? 'Diamonds Payment Flow' : 'Redeem Code Payment Flow'}</strong></span>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsPreviewModalOpen(true)}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer font-mono"
          >
            <Eye className="w-4 h-4 text-emerald-400" />
            Preview Customer Popup
          </button>

          <button
            onClick={handleReset}
            className="px-3 py-2 bg-slate-800 hover:bg-rose-500/20 text-slate-300 hover:text-rose-300 border border-slate-700 hover:border-rose-500/30 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer font-mono"
          >
            <RotateCcw className="w-4 h-4" />
            Reset Defaults
          </button>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-5 py-2 bg-emerald-400 hover:bg-emerald-300 text-slate-950 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/20"
          >
            {isSaving ? (
              <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>SAVE SETTINGS</span>
          </button>
        </div>
      </div>

      {/* SETTINGS GROUPS (COLLAPSIBLE) */}
      <div className="space-y-4">
        
        {/* 1. PRODUCT SELECTION */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <button
            onClick={() => toggleGroup('product')}
            className="w-full p-4 sm:p-5 flex items-center justify-between bg-slate-900/90 hover:bg-slate-800/80 transition-colors text-left cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-mono font-bold text-xs">01</div>
              <span className="text-sm font-extrabold text-white tracking-wide">PRODUCT SELECTION & CATALOG LABELS</span>
            </div>
            {openGroups.product ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
          </button>

          {openGroups.product && (
            <div className="p-4 sm:p-6 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-mono font-bold text-slate-300 mb-1.5">Category Heading</label>
                <input
                  type="text"
                  value={activeSubTab === 'diamonds' ? diamondsSettings.categoryHeading : redeemSettings.categoryHeading}
                  onChange={(e) => updateField('categoryHeading', e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div>
                <label className="block text-xs font-mono font-bold text-slate-300 mb-1.5">Product Selection Heading</label>
                <input
                  type="text"
                  value={activeSubTab === 'diamonds' ? diamondsSettings.productSelectionHeading : redeemSettings.productSelectionHeading}
                  onChange={(e) => updateField('productSelectionHeading', e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div>
                <label className="block text-xs font-mono font-bold text-slate-300 mb-1.5">Product Name Label</label>
                <input
                  type="text"
                  value={activeSubTab === 'diamonds' ? diamondsSettings.productNameLabel : redeemSettings.productNameLabel}
                  onChange={(e) => updateField('productNameLabel', e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:outline-none focus:border-emerald-400"
                />
              </div>

              {activeSubTab === 'diamonds' ? (
                <div>
                  <label className="block text-xs font-mono font-bold text-slate-300 mb-1.5">Diamond Quantity Label</label>
                  <input
                    type="text"
                    value={diamondsSettings.diamondQuantityLabel}
                    onChange={(e) => updateField('diamondQuantityLabel', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:outline-none focus:border-emerald-400"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-mono font-bold text-slate-300 mb-1.5">Redeem Value Label</label>
                  <input
                    type="text"
                    value={redeemSettings.redeemValueLabel}
                    onChange={(e) => updateField('redeemValueLabel', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:outline-none focus:border-emerald-400"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-mono font-bold text-slate-300 mb-1.5">Price Label</label>
                <input
                  type="text"
                  value={activeSubTab === 'diamonds' ? diamondsSettings.priceLabel : redeemSettings.priceLabel}
                  onChange={(e) => updateField('priceLabel', e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div>
                <label className="block text-xs font-mono font-bold text-slate-300 mb-1.5">Out-of-Stock Message</label>
                <input
                  type="text"
                  value={activeSubTab === 'diamonds' ? diamondsSettings.outOfStockMessage : redeemSettings.outOfStockMessage}
                  onChange={(e) => updateField('outOfStockMessage', e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-mono font-bold text-slate-300 mb-1.5">
                  {activeSubTab === 'diamonds' ? 'Selected Product Message' : 'Product Description'}
                </label>
                <textarea
                  rows={2}
                  value={activeSubTab === 'diamonds' ? diamondsSettings.selectedProductMessage : redeemSettings.productDescription}
                  onChange={(e) => updateField(activeSubTab === 'diamonds' ? 'selectedProductMessage' : 'productDescription', e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:outline-none focus:border-emerald-400"
                />
              </div>
            </div>
          )}
        </div>

        {/* 2. PLAYER VERIFICATION (Diamonds) OR ORDER INFO (Redeem) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <button
            onClick={() => toggleGroup('verification')}
            className="w-full p-4 sm:p-5 flex items-center justify-between bg-slate-900/90 hover:bg-slate-800/80 transition-colors text-left cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-mono font-bold text-xs">02</div>
              <span className="text-sm font-extrabold text-white tracking-wide">
                {activeSubTab === 'diamonds' ? 'PLAYER UID VERIFICATION MESSAGES' : 'ORDER INFORMATION & SUMMARY'}
              </span>
            </div>
            {openGroups.verification ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
          </button>

          {openGroups.verification && (
            <div className="p-4 sm:p-6 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {activeSubTab === 'diamonds' ? (
                <>
                  <div>
                    <label className="block text-xs font-mono font-bold text-slate-300 mb-1.5">Verification Heading</label>
                    <input
                      type="text"
                      value={diamondsSettings.verificationHeading}
                      onChange={(e) => updateField('verificationHeading', e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:outline-none focus:border-emerald-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono font-bold text-slate-300 mb-1.5">Player ID Label</label>
                    <input
                      type="text"
                      value={diamondsSettings.playerIdLabel}
                      onChange={(e) => updateField('playerIdLabel', e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:outline-none focus:border-emerald-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono font-bold text-slate-300 mb-1.5">Verification Button Text</label>
                    <input
                      type="text"
                      value={diamondsSettings.verificationButtonText}
                      onChange={(e) => updateField('verificationButtonText', e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:outline-none focus:border-emerald-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono font-bold text-slate-300 mb-1.5">Verification Loading Message</label>
                    <input
                      type="text"
                      value={diamondsSettings.verificationLoadingMessage}
                      onChange={(e) => updateField('verificationLoadingMessage', e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:outline-none focus:border-emerald-400"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-mono font-bold text-slate-300 mb-1.5">Verification Successful Message</label>
                    <input
                      type="text"
                      value={diamondsSettings.verificationSuccessfulMessage}
                      onChange={(e) => updateField('verificationSuccessfulMessage', e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:outline-none focus:border-emerald-400"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-mono font-bold text-slate-300 mb-1.5">Invalid Player ID Message</label>
                    <input
                      type="text"
                      value={diamondsSettings.invalidPlayerIdMessage}
                      onChange={(e) => updateField('invalidPlayerIdMessage', e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:outline-none focus:border-emerald-400"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-mono font-bold text-slate-300 mb-1.5">Order Summary Heading</label>
                    <input
                      type="text"
                      value={redeemSettings.orderSummaryHeading}
                      onChange={(e) => updateField('orderSummaryHeading', e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:outline-none focus:border-emerald-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono font-bold text-slate-300 mb-1.5">Selected Product Label</label>
                    <input
                      type="text"
                      value={redeemSettings.selectedProductLabel}
                      onChange={(e) => updateField('selectedProductLabel', e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:outline-none focus:border-emerald-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono font-bold text-slate-300 mb-1.5">Continue to Payment Button Text</label>
                    <input
                      type="text"
                      value={redeemSettings.continueToPaymentButtonText}
                      onChange={(e) => updateField('continueToPaymentButtonText', e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:outline-none focus:border-emerald-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono font-bold text-slate-300 mb-1.5">Pay Now Button Text</label>
                    <input
                      type="text"
                      value={redeemSettings.payNowButtonText}
                      onChange={(e) => updateField('payNowButtonText', e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:outline-none focus:border-emerald-400"
                    />
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* 3. PAYMENT INSTRUCTIONS */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <button
            onClick={() => toggleGroup('payment')}
            className="w-full p-4 sm:p-5 flex items-center justify-between bg-slate-900/90 hover:bg-slate-800/80 transition-colors text-left cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-mono font-bold text-xs">03</div>
              <span className="text-sm font-extrabold text-white tracking-wide">PAYMENT INSTRUCTIONS & SUMMARY LABELS</span>
            </div>
            {openGroups.payment ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
          </button>

          {openGroups.payment && (
            <div className="p-4 sm:p-6 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-mono font-bold text-slate-300 mb-1.5">Payment Section Heading</label>
                <input
                  type="text"
                  value={activeSubTab === 'diamonds' ? diamondsSettings.paymentSectionHeading : redeemSettings.orderSummaryHeading}
                  onChange={(e) => updateField(activeSubTab === 'diamonds' ? 'paymentSectionHeading' : 'orderSummaryHeading', e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div>
                <label className="block text-xs font-mono font-bold text-slate-300 mb-1.5">Total Payable Label</label>
                <input
                  type="text"
                  value={activeSubTab === 'diamonds' ? diamondsSettings.totalPayableLabel : redeemSettings.totalPayableLabel}
                  onChange={(e) => updateField('totalPayableLabel', e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-mono font-bold text-slate-300 mb-1.5">Payment Instructions (Supports line breaks)</label>
                <textarea
                  rows={3}
                  value={activeSubTab === 'diamonds' ? diamondsSettings.paymentInstructions : redeemSettings.additionalPaymentInstructions}
                  onChange={(e) => updateField(activeSubTab === 'diamonds' ? 'paymentInstructions' : 'additionalPaymentInstructions', e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div>
                <label className="block text-xs font-mono font-bold text-slate-300 mb-1.5">Pay Now Button Text</label>
                <input
                  type="text"
                  value={activeSubTab === 'diamonds' ? diamondsSettings.payNowButtonText : redeemSettings.payNowButtonText}
                  onChange={(e) => updateField('payNowButtonText', e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div>
                <label className="block text-xs font-mono font-bold text-slate-300 mb-1.5">Payment Processing Message</label>
                <input
                  type="text"
                  value={activeSubTab === 'diamonds' ? diamondsSettings.paymentProcessingMessage : redeemSettings.paymentProcessingMessage}
                  onChange={(e) => updateField('paymentProcessingMessage', e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:outline-none focus:border-emerald-400"
                />
              </div>
            </div>
          )}
        </div>

        {/* 4. PAYMENT STATUS */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <button
            onClick={() => toggleGroup('status')}
            className="w-full p-4 sm:p-5 flex items-center justify-between bg-slate-900/90 hover:bg-slate-800/80 transition-colors text-left cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-mono font-bold text-xs">04</div>
              <span className="text-sm font-extrabold text-white tracking-wide">PAYMENT STATUS & VERIFICATION MESSAGES</span>
            </div>
            {openGroups.status ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
          </button>

          {openGroups.status && (
            <div className="p-4 sm:p-6 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-mono font-bold text-slate-300 mb-1.5">Payment Successful Heading</label>
                <input
                  type="text"
                  value={activeSubTab === 'diamonds' ? diamondsSettings.paymentSuccessfulHeading : redeemSettings.paymentSuccessfulHeading}
                  onChange={(e) => updateField('paymentSuccessfulHeading', e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div>
                <label className="block text-xs font-mono font-bold text-slate-300 mb-1.5">Payment Successful Message</label>
                <input
                  type="text"
                  value={activeSubTab === 'diamonds' ? diamondsSettings.paymentSuccessfulMessage : redeemSettings.paymentSuccessfulMessage}
                  onChange={(e) => updateField('paymentSuccessfulMessage', e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div>
                <label className="block text-xs font-mono font-bold text-slate-300 mb-1.5">Payment Failed Heading</label>
                <input
                  type="text"
                  value={activeSubTab === 'diamonds' ? diamondsSettings.paymentFailedHeading : redeemSettings.paymentFailedHeading}
                  onChange={(e) => updateField('paymentFailedHeading', e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div>
                <label className="block text-xs font-mono font-bold text-slate-300 mb-1.5">Payment Failed Message</label>
                <input
                  type="text"
                  value={activeSubTab === 'diamonds' ? diamondsSettings.paymentFailedMessage : redeemSettings.paymentFailedMessage}
                  onChange={(e) => updateField('paymentFailedMessage', e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:outline-none focus:border-emerald-400"
                />
              </div>
            </div>
          )}
        </div>

        {/* 5. DELIVERY MESSAGES */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <button
            onClick={() => toggleGroup('delivery')}
            className="w-full p-4 sm:p-5 flex items-center justify-between bg-slate-900/90 hover:bg-slate-800/80 transition-colors text-left cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-mono font-bold text-xs">05</div>
              <span className="text-sm font-extrabold text-white tracking-wide">
                {activeSubTab === 'diamonds' ? 'DIAMOND DELIVERY & NOTICE MESSAGES' : 'REDEEM CODE DELIVERY MESSAGES'}
              </span>
            </div>
            {openGroups.delivery ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
          </button>

          {openGroups.delivery && (
            <div className="p-4 sm:p-6 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {activeSubTab === 'diamonds' ? (
                <>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-mono font-bold text-slate-300 mb-1.5">Delivery Notice Heading</label>
                    <input
                      type="text"
                      value={diamondsSettings.deliveryNoticeHeading}
                      onChange={(e) => updateField('deliveryNoticeHeading', e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:outline-none focus:border-emerald-400"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-mono font-bold text-slate-300 mb-1.5">English Delivery Message (Supports multiline & markdown)</label>
                    <textarea
                      rows={4}
                      value={diamondsSettings.englishDeliveryMessage}
                      onChange={(e) => updateField('englishDeliveryMessage', e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:outline-none focus:border-emerald-400"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-mono font-bold text-slate-300 mb-1.5">Hindi / Hinglish Delivery Message (Supports multiline & emojis)</label>
                    <textarea
                      rows={4}
                      value={diamondsSettings.hindiHinglishDeliveryMessage}
                      onChange={(e) => updateField('hindiHinglishDeliveryMessage', e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:outline-none focus:border-emerald-400"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-mono font-bold text-slate-300 mb-1.5">Delivery Heading</label>
                    <input
                      type="text"
                      value={redeemSettings.deliveryHeading}
                      onChange={(e) => updateField('deliveryHeading', e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:outline-none focus:border-emerald-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono font-bold text-slate-300 mb-1.5">Delivery Successful Message</label>
                    <input
                      type="text"
                      value={redeemSettings.deliverySuccessfulMessage}
                      onChange={(e) => updateField('deliverySuccessfulMessage', e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:outline-none focus:border-emerald-400"
                    />
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* 6. SUCCESS POPUP */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <button
            onClick={() => toggleGroup('success')}
            className="w-full p-4 sm:p-5 flex items-center justify-between bg-slate-900/90 hover:bg-slate-800/80 transition-colors text-left cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-mono font-bold text-xs">06</div>
              <span className="text-sm font-extrabold text-white tracking-wide">SUCCESS POPUP & FULFILLMENT DIALOG</span>
            </div>
            {openGroups.success ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
          </button>

          {openGroups.success && (
            <div className="p-4 sm:p-6 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-mono font-bold text-slate-300 mb-1.5">Success Heading</label>
                <input
                  type="text"
                  value={activeSubTab === 'diamonds' ? diamondsSettings.successHeading : redeemSettings.successHeading}
                  onChange={(e) => updateField('successHeading', e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div>
                <label className="block text-xs font-mono font-bold text-slate-300 mb-1.5">Success Description</label>
                <input
                  type="text"
                  value={activeSubTab === 'diamonds' ? diamondsSettings.successDescription : redeemSettings.successDescription}
                  onChange={(e) => updateField('successDescription', e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:outline-none focus:border-emerald-400"
                />
              </div>

              {activeSubTab === 'redeem' && (
                <div className="flex items-center justify-between p-3.5 bg-slate-950 rounded-xl border border-slate-800 sm:col-span-2">
                  <div>
                    <span className="text-xs font-bold text-white block">Green Tick Success Indicator</span>
                    <span className="text-[11px] text-slate-400">Show prominent green tick icon inside success modal popup</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={redeemSettings.greenTickEnabled}
                    onChange={(e) => updateField('greenTickEnabled', e.target.checked)}
                    className="w-4 h-4 accent-emerald-400 cursor-pointer"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-mono font-bold text-slate-300 mb-1.5">Copy Button Text</label>
                <input
                  type="text"
                  value={activeSubTab === 'diamonds' ? diamondsSettings.copyButtonText : redeemSettings.copyCodeButtonText}
                  onChange={(e) => updateField(activeSubTab === 'diamonds' ? 'copyButtonText' : 'copyCodeButtonText', e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div>
                <label className="block text-xs font-mono font-bold text-slate-300 mb-1.5">Close / Done Button Text</label>
                <input
                  type="text"
                  value={activeSubTab === 'diamonds' ? diamondsSettings.closeButtonText : redeemSettings.doneButtonText}
                  onChange={(e) => updateField(activeSubTab === 'diamonds' ? 'closeButtonText' : 'doneButtonText', e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:outline-none focus:border-emerald-400"
                />
              </div>
            </div>
          )}
        </div>

        {/* 7. ADDITIONAL CUSTOM TEXT */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <button
            onClick={() => toggleGroup('custom')}
            className="w-full p-4 sm:p-5 flex items-center justify-between bg-slate-900/90 hover:bg-slate-800/80 transition-colors text-left cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-mono font-bold text-xs">07</div>
              <span className="text-sm font-extrabold text-white tracking-wide">ADMIN-CONFIGURABLE CUSTOM FOOTER & NOTES</span>
            </div>
            {openGroups.custom ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
          </button>

          {openGroups.custom && (
            <div className="p-4 sm:p-6 border-t border-slate-800 grid grid-cols-1 gap-4">
              <div>
                <label className="block text-xs font-mono font-bold text-slate-300 mb-1.5">Optional Footer Message / Notice</label>
                <textarea
                  rows={3}
                  value={activeSubTab === 'diamonds' ? diamondsSettings.additionalInformation : redeemSettings.optionalFooterMessage}
                  onChange={(e) => updateField(activeSubTab === 'diamonds' ? 'additionalInformation' : 'optionalFooterMessage', e.target.value)}
                  placeholder="Leave empty if not required..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:outline-none focus:border-emerald-400"
                />
              </div>
            </div>
          )}
        </div>

      </div>

      {/* BOTTOM SAVE BAR */}
      <div className="flex items-center justify-end gap-3 pt-4">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-6 py-3 bg-emerald-400 hover:bg-emerald-300 text-slate-950 rounded-2xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/20"
        >
          {isSaving ? (
            <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <Save className="w-4 h-4" />
          )}
          <span>SAVE {activeSubTab === 'diamonds' ? 'DIAMONDS' : 'REDEEM CODE'} SETTINGS</span>
        </button>
      </div>

      {/* PREVIEW MODAL */}
      {isPreviewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-emerald-500/40 w-full max-w-lg rounded-3xl p-6 shadow-2xl relative space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-emerald-400 font-mono text-xs font-bold uppercase tracking-wider">
                <Sparkles className="w-4 h-4" />
                <span>Live Preview — {activeSubTab.toUpperCase()} SETTINGS</span>
              </div>
              <button
                onClick={() => setIsPreviewModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 p-4 rounded-2xl bg-slate-950 border border-slate-800 font-mono text-xs space-y-3">
              <div className="text-emerald-400 font-bold uppercase tracking-wider">
                {activeSubTab === 'diamonds' ? diamondsSettings.categoryHeading : redeemSettings.categoryHeading}
              </div>
              <div className="text-white font-extrabold text-base">
                {activeSubTab === 'diamonds' ? diamondsSettings.productSelectionHeading : redeemSettings.productSelectionHeading}
              </div>
              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-slate-300 space-y-1">
                <div><strong>Button Text:</strong> {activeSubTab === 'diamonds' ? diamondsSettings.payNowButtonText : redeemSettings.payNowButtonText}</div>
                <div><strong>Success Heading:</strong> {activeSubTab === 'diamonds' ? diamondsSettings.successHeading : redeemSettings.successHeading}</div>
                <div><strong>Delivery Message:</strong> {activeSubTab === 'diamonds' ? diamondsSettings.englishDeliveryMessage : redeemSettings.deliveryHeading}</div>
              </div>
            </div>

            <button
              onClick={() => setIsPreviewModalOpen(false)}
              className="w-full py-3 bg-emerald-400 hover:bg-emerald-300 text-slate-950 rounded-xl font-black text-xs cursor-pointer"
            >
              CLOSE PREVIEW
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
