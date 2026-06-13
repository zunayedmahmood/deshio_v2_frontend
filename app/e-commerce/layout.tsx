'use client';

import { Suspense } from 'react';
import { usePathname } from 'next/navigation';
import { CustomerAuthProvider } from '@/contexts/CustomerAuthContext';

import { PromotionProvider } from '@/contexts/PromotionContext';
import Footer from '@/components/ecommerce/Footer';
import ScrollToTopOnRouteChange from '@/components/ecommerce/ScrollToTopOnRouteChange';
import GlobalCartSidebar from '@/components/ecommerce/cart/GlobalCartSidebar';


export default function EcommerceLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLiveFeedPage = pathname === '/e-commerce/live/productsfeed';

  return (
    <CustomerAuthProvider>
      <PromotionProvider>
        <Suspense fallback={null}>
          <ScrollToTopOnRouteChange />
        </Suspense>

        {!isLiveFeedPage && <GlobalCartSidebar />}

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
          <div style={{ position: 'relative', zIndex: 10 }}>
            {children}
          </div>
          {!isLiveFeedPage && (
            <div style={{ position: 'relative', zIndex: 1 }}>
              <Footer />
            </div>
          )}
        </div>
      </PromotionProvider>
    </CustomerAuthProvider>
  );
}
