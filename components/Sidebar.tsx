'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Store,
  FolderTree,
  Package,
  ClipboardList,
  Wrench,
  CreditCard,
  ShoppingCart,
  X,
  AlertTriangle,
  Truck,
  Search,
  History,
  ShieldCheck,
  RotateCcw,
  Tag,
  Users,
  FileText,
  Settings,
} from 'lucide-react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { PAGE_ACCESS } from '@/lib/accessMap';
// ──────────────────────────────
// Perfect discriminated union
// ──────────────────────────────
type MenuItem =
  | {
      icon: React.ComponentType<{ className?: string }>;
      label: string;
      href: string;
    }
  | {
      icon: React.ComponentType<{ className?: string }>;
      label: string;
      subMenu: { label: string; href: string }[];
    };

// ──────────────────────────────
// Props
// ──────────────────────────────
interface SidebarProps {
  isOpen?: boolean;
  setIsOpen?: (open: boolean) => void;
  onClose?: () => void;
  darkMode?: boolean;
}

const SIDEBAR_OPEN_MENU_KEY = 'deshio.admin.sidebar.openMenu';
const SIDEBAR_SCROLL_TOP_KEY = 'deshio.admin.sidebar.scrollTop';

const hrefPath = (href: string) => href.split('?')[0];

const pathMatches = (pathname: string, href: string) => {
  const target = hrefPath(href);

  return pathname === target || pathname.startsWith(`${target}/`);
};

const getBestMatchingHref = (pathname: string, hrefs: string[]) => {
  return (
    hrefs
      .map(hrefPath)
      .filter((href) => pathMatches(pathname, href))
      .sort((left, right) => right.length - left.length)[0] ?? null
  );
};

export default function Sidebar({
  isOpen = false,
  setIsOpen,
  onClose,
}: SidebarProps) {
  const pathname = usePathname();
  const { isRole, isSuperAdmin, isLoading } = useAuth();
  const navRef = useRef<HTMLElement | null>(null);
  const scrollFrameRef = useRef<number | null>(null);

  const canAccessHref = (href: string) => {
    return true; // For now, literally always allow access to show all pages
  };

  const toggleSubMenu = (label: string) => {
    setOpenMenu((prev) => (prev === label ? null : label));
  };

  const menuItems: MenuItem[] = [
    {
      icon: LayoutDashboard,
      label: 'Dashboard',
      subMenu: [
        { label: 'Overview', href: '/dashboard' },
      ],
    },
    {
      icon: Truck,
      label: 'Vendor Management',
      subMenu: [
        { label: 'Vendor Payment', href: '/vendor' },
        { label: 'Purchase Order', href: '/purchase-order' },
      ],
    },
    { icon: Store, label: 'Store', href: '/store' },
    { icon: Store, label: 'Store Assignment', href: '/store-assignment' },
    { icon: ClipboardList, label: 'Bulk Store Assignment', href: '/bulk-store-assignment' },
    { icon: FolderTree, label: 'Category', href: '/category' },
    { icon: Tag, label: 'Collections', href: '/collections' },
    {
      icon: Package,
      label: 'Product',
      subMenu: [
        { label: 'Field', href: '/product/field' },
        { label: 'Product List', href: '/product/list' },
        { label: 'Archived Products', href: '/product/archived' },
        { label: 'Batch', href: '/product/batch' },
      ],
    },
    {
      icon: ClipboardList,
      label: 'Inventory',
      subMenu: [
        { label: 'Manage Stock', href: '/inventory/manage_stock' },
        { label: 'View Inventory', href: '/inventory/view' },
        { label: 'Price Adjustment', href: '/inventory/batch-price-update' },
        { label: 'Barcode Relabeling', href: '/inventory/barcode-relabel' },
        { label: 'Barcode Rescue', href: '/inventory/revive-barcodes' },
        { label: 'Assignment Blockers', href: '/inventory/assignment-blockers' },
        { label: 'Free Reserved Products', href: '/inventory/free-reserve-products' },
        { label: 'Delete Bulk Batch', href: '/inventory/deleteBulkBatch' },
        { label: 'Deleted Batch Report', href: '/inventory/deleted-batch-report' },
        { label: 'Dispatches', href: '/inventory/outlet-stock' },
        { label: 'Dispatch RTN Repair', href: '/inventory/dispatch-rtn-repair' },
        { label: 'Reports', href: '/inventory/reports' },
        { label: 'Project Report', href: '/inventory/project-report' },
      ],
    },
    { icon: ShoppingCart, label: 'POS', href: '/pos' },
    { icon: ClipboardList, label: 'Purchase History', href: '/purchase-history' },
    {
      icon: FileText,
      label: 'Reports',
      subMenu: [
        { label: 'Reports Center', href: '/reports' },
      ],
    },
    { icon: ShoppingCart, label: 'Social Commerce', href: '/social-commerce' },
    {
      icon: Wrench,
      label: 'Services',
      subMenu: [
        { label: 'Services Catalog', href: '/services-management' },
        { label: 'Service Orders', href: '/service-orders' },
      ],
    },
    { icon: Package, label: 'Orders', href: '/orders' },
    { icon: Users, label: 'Customer Rewards', href: '/customer-rewards' },
    { icon: CreditCard, label: 'Installments', href: '/orders?view=installments' },
    { icon: Package, label: 'Online Order Packing', href: '/social-commerce/package' },
    { icon: Package, label: 'PreOrders', href: '/preorders' },
    { icon: AlertTriangle, label: 'Extra Panel', href: '/extra' },
    { icon: RotateCcw, label: 'Returns & Exchanges', href: '/returns' },
    { icon: Tag, label: 'Sale Campaigns', href: '/campaigns' },
    {
      icon: Settings,
      label: 'Settings',
      subMenu: [
        { label: 'Homepage Configuration', href: '/settings/homepage' },
      ],
    },
    { icon: Search, label: 'Lookup', href: '/lookup' },
    { icon: History, label: 'Activity Log', href: '/activity-logs' },
    { icon: CreditCard, label: 'Transaction', href: '/transaction' },
    { icon: CreditCard, label: 'Accounting', href: '/accounting' },
    {
      icon: Users,
      label: 'Human Resources (HRM)',
      subMenu: [
        { label: 'Employee Portal', href: '/hrm/my' },
        { label: 'Branch Management', href: '/hrm/branch' },
        { label: 'Attendance Logs', href: '/hrm/attendance' },
        { label: 'Sales Targets', href: '/hrm/sales-targets' },
        { label: 'Rewards & Fines', href: '/hrm/rewards-fines' },
      ],
    },
    { icon: CreditCard, label: 'Employee Management', href: '/employees' },


  ];

  const activeMenuLabel =
    menuItems.find(
      (item) =>
        'subMenu' in item &&
        item.subMenu.some((sub) => pathMatches(pathname, sub.href)),
    )?.label ?? null;

  // Start with the active group open so there is no collapsed-menu flash on
  // direct page loads. The previously opened group is restored below.
  const [openMenu, setOpenMenu] = useState<string | null>(activeMenuLabel);
  const initialActiveMenuLabelRef = useRef(activeMenuLabel);

  const closeSidebar = () => {
    if (setIsOpen) {
      setIsOpen(false);
      return;
    }

    onClose?.();
  };

  // Each admin page currently mounts its own Sidebar. Preserve UI state in
  // sessionStorage so route navigation does not reset the menu or jump to top.
  useLayoutEffect(() => {
    const storedOpenMenu = window.sessionStorage.getItem(SIDEBAR_OPEN_MENU_KEY);
    const nextOpenMenu =
      initialActiveMenuLabelRef.current || storedOpenMenu || null;

    setOpenMenu(nextOpenMenu);

    const storedScrollTop = Number(
      window.sessionStorage.getItem(SIDEBAR_SCROLL_TOP_KEY) || 0,
    );

    const frame = window.requestAnimationFrame(() => {
      if (navRef.current && Number.isFinite(storedScrollTop)) {
        navRef.current.scrollTop = storedScrollTop;
      }
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  // Also support layouts where the Sidebar remains mounted while pathname
  // changes. The destination's parent group should always remain visible.
  useEffect(() => {
    if (activeMenuLabel) {
      setOpenMenu(activeMenuLabel);
    }
  }, [activeMenuLabel]);

  useEffect(() => {
    if (openMenu) {
      window.sessionStorage.setItem(SIDEBAR_OPEN_MENU_KEY, openMenu);
    } else {
      window.sessionStorage.removeItem(SIDEBAR_OPEN_MENU_KEY);
    }
  }, [openMenu]);

  useEffect(() => {
    return () => {
      if (scrollFrameRef.current !== null) {
        window.cancelAnimationFrame(scrollFrameRef.current);
      }

      if (navRef.current) {
        window.sessionStorage.setItem(
          SIDEBAR_SCROLL_TOP_KEY,
          String(navRef.current.scrollTop),
        );
      }
    };
  }, []);

  const persistScrollTop = () => {
    if (navRef.current) {
      window.sessionStorage.setItem(
        SIDEBAR_SCROLL_TOP_KEY,
        String(navRef.current.scrollTop),
      );
    }
  };

  const handleMenuScroll = () => {
    if (scrollFrameRef.current !== null) {
      window.cancelAnimationFrame(scrollFrameRef.current);
    }

    scrollFrameRef.current = window.requestAnimationFrame(() => {
      if (navRef.current) {
        window.sessionStorage.setItem(
          SIDEBAR_SCROLL_TOP_KEY,
          String(navRef.current.scrollTop),
        );
      }

      scrollFrameRef.current = null;
    });
  };

  // Filter menu items based on permissions
  const filteredMenuItems: MenuItem[] = menuItems
    .map((item) => {
      if ('subMenu' in item) {
        const subMenu = item.subMenu.filter((sub) => canAccessHref(sub.href));
        return subMenu.length ? { ...item, subMenu } : null;
      }

      // simple link
      return canAccessHref((item as any).href) ? item : null;
    })
    .filter(Boolean) as MenuItem[];

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0 lg:static lg:z-auto flex flex-col`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 h-16">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-black dark:bg-white rounded-lg flex items-center justify-center">
              <span className="text-white dark:text-black font-bold text-xl">E</span>
            </div>
            <div>
              <h1 className="font-semibold text-gray-900 dark:text-white">ERP Admin</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">Management Panel</p>
            </div>
          </div>

          {/* Close button (mobile only) */}
          <button
            onClick={closeSidebar}
            className="lg:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Menu */}
        <nav
          ref={navRef}
          onScroll={handleMenuScroll}
          className="flex-1 overflow-y-auto py-4 px-3"
        >
          <p className="px-3 mb-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Main Menu
          </p>

          <ul className="space-y-1">
            {filteredMenuItems.map((item) => {
              const Icon = item.icon;
              const hasSubMenu = 'subMenu' in item;
              const activeSubMenuHref = hasSubMenu
                ? getBestMatchingHref(
                    pathname,
                    item.subMenu.map((sub) => sub.href),
                  )
                : null;

              const isActive = hasSubMenu
                ? activeSubMenuHref !== null
                : 'href' in item && pathMatches(pathname, item.href);

              const isSubMenuOpen = openMenu === item.label;

              return (
                <li key={item.label}>
                  {/* Main Item */}
                  {hasSubMenu ? (
                    <button
                      onClick={() => toggleSubMenu(item.label)}
                      className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-sm transition-all text-left
                        ${isActive
                          ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white font-medium'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="w-5 h-5 flex-shrink-0" />
                        <span>{item.label}</span>
                      </div>
                      <svg
                        className={`w-4 h-4 transition-transform ${isSubMenuOpen ? 'rotate-90' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  ) : (
                    <Link
                      href={(item as { href: string }).href}
                      onClick={persistScrollTop}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all
                        ${isActive
                          ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white font-medium'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                    >
                      <Icon className="w-5 h-5 flex-shrink-0" />
                      <span>{item.label}</span>
                    </Link>
                  )}

                  {/* Submenu */}
                  {hasSubMenu && isSubMenuOpen && (
                    <ul className="mt-2 ml-8 space-y-1">
                      {item.subMenu.map((sub) => (
                        <li key={sub.href}>
                          <Link
                            href={sub.href}
                            onClick={() => {
                              persistScrollTop();
                              setOpenMenu(item.label);
                              window.sessionStorage.setItem(
                                SIDEBAR_OPEN_MENU_KEY,
                                item.label,
                              );
                            }}
                            className={`block px-4 py-2 text-sm rounded-lg transition-all
                              ${activeSubMenuHref === hrefPath(sub.href)
                                ? 'text-blue-600 dark:text-blue-400 font-medium bg-blue-50 dark:bg-blue-900/20'
                                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                              }`}
                          >
                            {sub.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>
    </>
  );
}