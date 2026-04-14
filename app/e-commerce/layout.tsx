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

          {/* Clean white e-commerce layout */}
          <div
            className="ec-root"
            style={{
              minHeight: '100vh',
              backgroundColor: '#ffffff',
              position: 'relative',
            }}
          >
            {/* All page content */}
            <div style={{ position: 'relative' }}>
              {children}
              <Footer />
            </div>
          </div>
        </CartProvider>
      </PromotionProvider>
    </CustomerAuthProvider>
  );
}
