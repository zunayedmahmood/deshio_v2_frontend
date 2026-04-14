'use client';

import { Suspense } from 'react';
import { CustomerAuthProvider } from '@/contexts/CustomerAuthContext';
import { CartProvider } from '@/app/e-commerce/CartContext';
import { PromotionProvider } from '@/contexts/PromotionContext';
import Footer from '@/components/ecommerce/Footer';
import ScrollToTopOnRouteChange from '@/components/ecommerce/ScrollToTopOnRouteChange';
import GlobalCartSidebar from '@/components/ecommerce/cart/GlobalCartSidebar';


export default function EcommerceLayout({ children }: { children: React.ReactNode }) {
  return (
    <CustomerAuthProvider>
      <PromotionProvider>
        <CartProvider>

          <Suspense fallback={null}>
            <ScrollToTopOnRouteChange />
          </Suspense>

          <GlobalCartSidebar />

          {/* ── Root wrapper: hardcoded dark ink background, no CSS class dependency ── */}
          <div
            className="ec-root"
            style={{
              minHeight: '100vh',
              backgroundColor: '#0d0d0d',
              position: 'relative',
            }}
          >
            {/* Grid texture — real DOM div, not pseudo-element, z-index:0 fixed */}
            <div
              aria-hidden="true"
              style={{
                position: 'fixed',
                inset: 0,
                zIndex: 0,
                pointerEvents: 'none',
                backgroundImage: [
                  'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px)',
                  'linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
                ].join(', '),
                backgroundSize: '56px 56px',
              }}
            />

            {/* Atmospheric glow blobs — fixed, layered gold + blue accents */}
            <div
              aria-hidden="true"
              style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}
            >
              {/* Top-left — primary gold bloom */}
              <div style={{
                position: 'absolute', top: '-15vh', left: '-10vw',
                width: '65vw', height: '65vw', maxWidth: 800, maxHeight: 800,
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(176,124,58,0.20) 0%, rgba(176,124,58,0.07) 45%, transparent 70%)',
                filter: 'blur(40px)',
              }} />
              {/* Top-right — cool blue counter */}
              <div style={{
                position: 'absolute', top: '-5vh', right: '-8vw',
                width: '45vw', height: '45vw', maxWidth: 560, maxHeight: 560,
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(90,110,160,0.10) 0%, transparent 70%)',
                filter: 'blur(50px)',
              }} />
              {/* Mid-left — secondary amber */}
              <div style={{
                position: 'absolute', top: '38vh', left: '-5vw',
                width: '40vw', height: '50vh', maxWidth: 500,
                borderRadius: '50%',
                background: 'radial-gradient(ellipse, rgba(176,124,58,0.09) 0%, transparent 65%)',
                filter: 'blur(60px)',
              }} />
              {/* Center — faint gold haze */}
              <div style={{
                position: 'absolute', top: '42vh', left: '50%',
                transform: 'translateX(-50%)',
                width: '60vw', height: '40vh', maxWidth: 700,
                borderRadius: '50%',
                background: 'radial-gradient(ellipse, rgba(176,124,58,0.06) 0%, transparent 70%)',
                filter: 'blur(80px)',
              }} />
              {/* Mid-right — warm accent */}
              <div style={{
                position: 'absolute', top: '58vh', right: '-5vw',
                width: '35vw', height: '40vh', maxWidth: 450,
                borderRadius: '50%',
                background: 'radial-gradient(ellipse, rgba(200,150,70,0.08) 0%, transparent 65%)',
                filter: 'blur(55px)',
              }} />
              {/* Bottom-left — grounding warm */}
              <div style={{
                position: 'absolute', bottom: '-10vh', left: '-5vw',
                width: '50vw', height: '50vh', maxWidth: 600,
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(176,124,58,0.12) 0%, rgba(176,124,58,0.03) 50%, transparent 70%)',
                filter: 'blur(50px)',
              }} />
              {/* Bottom-right — cool finish */}
              <div style={{
                position: 'absolute', bottom: '-5vh', right: '-8vw',
                width: '40vw', height: '40vh', maxWidth: 500,
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(80,100,150,0.08) 0%, transparent 70%)',
                filter: 'blur(60px)',
              }} />
            </div>

            {/* All page content — above grid + glow */}
            <div style={{ position: 'relative', zIndex: 10 }}>
              {children}
              <Footer />
            </div>
          </div>
        </CartProvider>
      </PromotionProvider>
    </CustomerAuthProvider>
  );
}

