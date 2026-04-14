'use client';

import React from 'react';
import { X, Loader2, ShoppingCart } from 'lucide-react';
import { useCart } from '../../../app/e-commerce/CartContext';
import { useRouter } from 'next/navigation';
import CartItem from './CartItem';
import checkoutService from '../../../services/checkoutService';

const formatBDT = (value: number) => {
  return `৳${value.toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

interface CartSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CartSidebar({ isOpen, onClose }: CartSidebarProps) {
  const { cart, getTotalPrice, isLoading } = useCart();
  const router = useRouter();

  const subtotal = getTotalPrice();
  const deliveryCharge = checkoutService.calculateDeliveryCharge('Dhaka');
  const total = subtotal + deliveryCharge;

  const isAnyOverStock = cart.some(item => typeof item.maxQuantity === 'number' && item.quantity > item.maxQuantity);

  const handleCheckout = () => {
    if (isAnyOverStock) return;
    router.push('/e-commerce/checkout');
    onClose();
  };

  const handleViewCart = () => {
    router.push('/e-commerce/cart');
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[100] bg-[rgba(28,24,18,0.30)] backdrop-blur-[4px] ec-anim-backdrop"
          onClick={onClose}
        />
      )}

      {/* Side Drawer */}
      <div
        className={`
          fixed right-0 top-0 bottom-0 z-[101] w-full sm:w-[400px] 
          bg-[var(--bg-depth)] shadow-[-20px_0_80px_rgba(0,0,0,0.12)]
          flex flex-col transition-transform duration-500 cubic-bezier(0.32, 0.72, 0, 1)
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
        style={{
          borderLeft: '1px solid var(--border-default)',
        }}
      >
        {/* Header */}
        <div className="flex h-20 items-center justify-between px-6 border-b border-[var(--border-default)]">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-medium text-[var(--text-primary)]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>Your Bag</h2>
            <span className="text-[11px] font-bold text-[var(--gold)]" style={{ fontFamily: "'DM Mono', monospace" }}>
              ({cart.length})
            </span>
          </div>
          <button
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto ec-scrollbar p-6">
          {/* Loading State */}
          {isLoading && (
            <div className="flex flex-col justify-center items-center py-20 space-y-4">
              <Loader2 className="animate-spin text-[var(--gold)]" size={32} />
              <p className="text-[11px] font-bold tracking-widest text-white/20 uppercase" style={{ fontFamily: "'DM Mono', monospace" }}>Syncing bag...</p>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && cart.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 px-6 text-center animate-cart-slide-in">
              <div className="relative mb-8">
                <div className="h-24 w-24 rounded-full bg-white/[0.03] flex items-center justify-center border border-white/5">
                  <ShoppingCart className="h-10 w-10 text-white/20" />
                </div>
                <div className="absolute -right-2 -top-2 h-8 w-8 rounded-full bg-[--gold]/10 flex items-center justify-center border border-[--gold]/20 animate-pulse">
                  <X className="h-4 w-4 text-[--gold]" />
                </div>
              </div>
              <h3 className="text-2xl font-light text-[var(--text-primary)] mb-2" style={{ fontFamily: "'Cormorant Garamond', serif" }}>Your cart is empty</h3>
              <p className="text-xs text-[var(--text-secondary)] mb-10 max-w-[200px] leading-relaxed uppercase tracking-widest" style={{ fontFamily: "'DM Mono', monospace" }}>
                Add something to your collection to get started.
              </p>
              <button
                onClick={() => {
                  onClose();
                  router.push('/e-commerce/categories');
                }}
                className="ec-btn-ghost px-10 py-4"
              >
                Start Shopping
              </button>
            </div>
          )}

          {/* Cart Items */}
          {!isLoading && cart.length > 0 && (
            <div className="space-y-6">
              {cart.map((item) => (
                <div key={`${item.id}-${item.sku}`} className="animate-cart-slide-in">
                  <CartItem item={item} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {!isLoading && cart.length > 0 && (
          <div className="border-t border-[var(--border-default)] p-6 space-y-5 bg-[var(--bg-depth)]">
            <div className="flex items-center justify-between py-2 border-b border-[var(--border-default)]">
              <span className="text-sm font-medium text-[var(--text-secondary)]">Subtotal</span>
              <span className="text-xl font-medium text-[var(--text-primary)]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                {formatBDT(subtotal)}
              </span>
            </div>

            <div className="flex items-center justify-between py-1">
              <span className="text-[12px] text-[var(--text-muted)]">Includes standard delivery to your location</span>
            </div>

            {/* Buttons */}
            <div className="grid grid-cols-1 gap-3 pt-2">
              <button
                onClick={handleCheckout}
                disabled={isAnyOverStock}
                className="ec-btn-primary w-full py-4 text-xs font-bold tracking-widest uppercase"
              >
                PROCEED TO CHECKOUT
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 🔥 MOBILE: Slight page shift for better UX */}
      <style jsx>{`
        @media (max-width: 640px) {
          body {
            overflow: ${isOpen ? 'hidden' : 'auto'};
          }
        }
      `}</style>
    </>
  );
}