'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * @deprecated The cart page has been deprecated in favor of the Global Cart Sidebar and consolidated checkout flow.
 * Users are now redirected to the e-commerce home page.
 */
export default function CartPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to e-commerce home. The GlobalCartSidebar provides the cart UI now.
    router.replace('/e-commerce');
  }, [router]);

  return (
    <div className="min-h-screen bg-[var(--bg-root)] flex items-center justify-center">
      <div className="animate-pulse text-[var(--text-muted)] font-medium tracking-widest text-xs uppercase">
        Redirecting to Shop...
      </div>
    </div>
  );
}