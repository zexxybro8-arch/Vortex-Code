import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { PurchaseSuccessModal } from '../dashboard/PurchaseSuccessModal';

export const PaymentReturnHandler: React.FC = () => {
  const { user, addToast, refreshCustomerOrders } = useAuth();
  const [verifiedOrder, setVerifiedOrder] = useState<any>(null);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const processedOrdersRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const searchParams = new URLSearchParams(window.location.search);
    const pathname = window.location.pathname;

    const paymentSuccess = searchParams.get('payment_success') === 'true';
    const paymentPending = searchParams.get('payment_pending') === 'true';
    const paymentFailed = searchParams.get('payment_failed') === 'true';
    const errorMsg = searchParams.get('error');

    const storedOrderId =
      sessionStorage.getItem('vortex_pending_order_id') ||
      sessionStorage.getItem('vortex_pending_order_number');

    const isReturnRoute =
      pathname.startsWith('/payment/return') ||
      pathname.startsWith('/payment/callback');

    const rawOrderId = (
      searchParams.get('order_id') ||
      searchParams.get('orderId') ||
      searchParams.get('gateway_order_id') ||
      searchParams.get('order_number') ||
      searchParams.get('orderNumber') ||
      searchParams.get('id') ||
      ((paymentSuccess || isReturnRoute || paymentPending) ? storedOrderId : null)
    );

    const orderId = rawOrderId?.trim();

    // 1. Handle Explicit Failure
    if (paymentFailed) {
      sessionStorage.removeItem('vortex_pending_order_id');
      sessionStorage.removeItem('vortex_pending_order_number');
      addToast('error', errorMsg ? decodeURIComponent(errorMsg) : 'Payment was declined or cancelled on gateway.');
      window.history.replaceState({}, document.title, '/');
      return;
    }

    // 2. Handle Payment Return or Success/Pending query with Order ID
    if (orderId && (paymentSuccess || isReturnRoute || paymentPending)) {
      if (processedOrdersRef.current.has(orderId)) {
        return;
      }
      processedOrdersRef.current.add(orderId);

      let attempts = 0;
      const maxAttempts = 6;

      const verifyAndFulfill = async () => {
        try {
          // Strictly query the server-side payment status endpoint with customer ownership
          const res = await api.getPaymentStatus(
            orderId,
            user?.email,
            user?.customerId || user?.id
          );

          if (res && (res.status === 'PAID' || res.success) && res.order?.paymentStatus === 'PAID') {
            sessionStorage.removeItem('vortex_pending_order_id');
            sessionStorage.removeItem('vortex_pending_order_number');
            setVerifiedOrder(res.order);
            setIsSuccessModalOpen(true);
            await refreshCustomerOrders();
            window.history.replaceState({}, document.title, '/');
            return;
          }

          if (res && res.status === 'PENDING') {
            attempts += 1;
            if (attempts < maxAttempts) {
              setTimeout(verifyAndFulfill, 2500);
            } else {
              addToast('info', 'Payment verification pending. Please refresh shortly in My Orders.');
              window.history.replaceState({}, document.title, '/');
            }
            return;
          }

          if (res && (res.status === 'FAILED' || res.status === 'EXPIRED')) {
            sessionStorage.removeItem('vortex_pending_order_id');
            sessionStorage.removeItem('vortex_pending_order_number');
            addToast('error', res.message || 'Payment could not be verified by gateway.');
            window.history.replaceState({}, document.title, '/');
            return;
          }

          // Fallback check order status directly
          const fallbackRes = await api.getCheckoutOrderStatus(orderId);
          if (fallbackRes && fallbackRes.success && fallbackRes.order?.paymentStatus === 'PAID') {
            sessionStorage.removeItem('vortex_pending_order_id');
            sessionStorage.removeItem('vortex_pending_order_number');
            setVerifiedOrder(fallbackRes.order);
            setIsSuccessModalOpen(true);
            await refreshCustomerOrders();
            window.history.replaceState({}, document.title, '/');
          } else {
            addToast('info', 'Payment verification pending. Please refresh shortly.');
            window.history.replaceState({}, document.title, '/');
          }
        } catch (err: any) {
          console.warn('[PaymentReturnHandler] Verification query notice:', err.message);
          try {
            const fallbackRes = await api.getCheckoutOrderStatus(orderId);
            if (fallbackRes && fallbackRes.success && fallbackRes.order?.paymentStatus === 'PAID') {
              sessionStorage.removeItem('vortex_pending_order_id');
              sessionStorage.removeItem('vortex_pending_order_number');
              setVerifiedOrder(fallbackRes.order);
              setIsSuccessModalOpen(true);
              await refreshCustomerOrders();
              window.history.replaceState({}, document.title, '/');
              return;
            }
          } catch {
            // Ignore fallback error
          }
          if (paymentSuccess) {
            addToast('info', 'Payment verification in progress. Please check My Orders shortly.');
          }
          window.history.replaceState({}, document.title, '/');
        }
      };

      verifyAndFulfill();
    }
  }, [user, addToast, refreshCustomerOrders]);

  return (
    <PurchaseSuccessModal
      isOpen={isSuccessModalOpen}
      onClose={() => setIsSuccessModalOpen(false)}
      order={verifiedOrder}
    />
  );
};
