'use client';

import { useEffect, useMemo, useState } from 'react';
import { StoreProvider, useStore } from '@/contexts/StoreContext';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  UserRound,
  Users,
  ClipboardCheck,
  BarChart3,
  Target,
  BadgeDollarSign,
  WalletCards,
  Building2,
  ChevronDown,
} from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';

function HRMLayoutContent({ children }: { children: React.ReactNode }) {
  const { isGlobal, user } = useAuth();
  const { darkMode, setDarkMode } = useTheme();
  const { selectedStoreId, setSelectedStoreId, availableStores, isLoadingStores } = useStore();
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const tabs = useMemo(() => [
    { label: 'Overview', href: '/hrm', icon: LayoutDashboard, roles: ['branch-manager', 'admin', 'super-admin', 'online-moderator'] },
    { label: 'My HR', href: '/hrm/my', icon: UserRound, roles: ['employee', 'pos-salesman', 'branch-manager', 'admin', 'super-admin', 'online-moderator'] },
    { label: 'Staff', href: '/hrm/branch', icon: Users, roles: ['branch-manager', 'admin', 'super-admin', 'online-moderator'] },
    { label: 'Attendance', href: '/hrm/attendance', icon: ClipboardCheck, roles: ['branch-manager', 'admin', 'super-admin', 'online-moderator'] },
    { label: 'Sales', href: '/hrm/sales', icon: BarChart3, roles: ['branch-manager', 'admin', 'super-admin', 'online-moderator'] },
    { label: 'Targets', href: '/hrm/sales-targets', icon: Target, roles: ['branch-manager', 'admin', 'super-admin', 'online-moderator'] },
    { label: 'Rewards & Fines', href: '/hrm/rewards-fines', icon: BadgeDollarSign, roles: ['branch-manager', 'admin', 'super-admin', 'online-moderator'] },
    { label: 'Payroll', href: '/hrm/payroll', icon: WalletCards, roles: ['branch-manager', 'admin', 'super-admin', 'online-moderator'] },
  ], []);

  const filteredTabs = tabs.filter((tab) => !!user?.role?.slug && tab.roles.includes(user.role.slug));

  useEffect(() => {
    if (isGlobal && !selectedStoreId && availableStores.length > 0) {
      setSelectedStoreId(availableStores[0].id);
    }
  }, [availableStores, isGlobal, selectedStoreId, setSelectedStoreId]);

  const isActive = (href: string) => href === '/hrm' ? pathname === '/hrm' : pathname.startsWith(href);

  return (
    <div className={darkMode ? 'dark' : ''}>
      <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
        <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <Header
            darkMode={darkMode}
            setDarkMode={setDarkMode}
            toggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          />

          <main className="flex-1 overflow-y-auto">
            <div className="hrm-shell min-h-full bg-gray-50 dark:bg-gray-900">
              <style>{`
                .hrm-shell .hrm-card {
                  background: #ffffff !important;
                  border: 1px solid rgb(229 231 235) !important;
                  box-shadow: 0 1px 2px rgba(0,0,0,.03) !important;
                  backdrop-filter: none !important;
                }
                .dark .hrm-shell .hrm-card {
                  background: rgb(31 41 55) !important;
                  border-color: rgb(55 65 81) !important;
                }
                .hrm-shell .text-white { color: rgb(17 24 39) !important; }
                .dark .hrm-shell .text-white { color: rgb(249 250 251) !important; }
                .hrm-shell .text-main { color: rgb(17 24 39) !important; }
                .dark .hrm-shell .text-main { color: rgb(243 244 246) !important; }
                .hrm-shell .text-sub { color: rgb(75 85 99) !important; }
                .dark .hrm-shell .text-sub { color: rgb(209 213 219) !important; }
                .hrm-shell .text-muted { color: rgb(107 114 128) !important; }
                .dark .hrm-shell .text-muted { color: rgb(156 163 175) !important; }
                .hrm-shell .input-dark,
                .hrm-shell .select-dark {
                  background: #ffffff !important;
                  border: 1px solid rgb(209 213 219) !important;
                  color: rgb(17 24 39) !important;
                  box-shadow: none !important;
                }
                .dark .hrm-shell .input-dark,
                .dark .hrm-shell .select-dark {
                  background: rgb(31 41 55) !important;
                  border-color: rgb(75 85 99) !important;
                  color: rgb(243 244 246) !important;
                }
                .hrm-shell .input-dark::placeholder { color: rgb(156 163 175) !important; }
                .hrm-shell .select-dark option { background: #ffffff; color: rgb(17 24 39); }
                .dark .hrm-shell .select-dark option { background: rgb(31 41 55); color: rgb(243 244 246); }
                .hrm-shell .btn-primary {
                  background: rgb(17 24 39) !important;
                  color: #ffffff !important;
                  border: 1px solid rgb(17 24 39) !important;
                  box-shadow: none !important;
                }
                .hrm-shell .btn-primary:hover { background: rgb(31 41 55) !important; transform: none !important; }
                .hrm-shell .btn-ghost {
                  background: #ffffff !important;
                  border: 1px solid rgb(209 213 219) !important;
                  color: rgb(55 65 81) !important;
                }
                .dark .hrm-shell .btn-ghost {
                  background: rgb(31 41 55) !important;
                  border-color: rgb(75 85 99) !important;
                  color: rgb(229 231 235) !important;
                }
                .hrm-shell .btn-ghost:hover { background: rgb(249 250 251) !important; }
                .dark .hrm-shell .btn-ghost:hover { background: rgb(55 65 81) !important; }
                .hrm-shell .progress-track { background: rgb(229 231 235) !important; }
                .dark .hrm-shell .progress-track { background: rgb(55 65 81) !important; }
                .hrm-shell .progress-gold,
                .hrm-shell .progress-blue { background: rgb(37 99 235) !important; }
                .hrm-shell .progress-green { background: rgb(22 163 74) !important; }
                .hrm-shell .gold-shimmer {
                  background: none !important;
                  -webkit-text-fill-color: currentColor !important;
                  color: rgb(17 24 39) !important;
                }
                .dark .hrm-shell .gold-shimmer { color: rgb(249 250 251) !important; }
                .hrm-shell .avatar-ring { background: rgb(229 231 235) !important; padding: 1px !important; }
                .dark .hrm-shell .avatar-ring { background: rgb(75 85 99) !important; }
                .hrm-shell .table-row-hover:hover { background: rgb(249 250 251) !important; }
                .dark .hrm-shell .table-row-hover:hover { background: rgb(55 65 81) !important; }
              `}</style>

              <div className="border-b border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
                <div className="px-6 py-5">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                    <div>
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900">
                          <Users className="h-5 w-5" />
                        </div>
                        <div>
                          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Human Resources</h1>
                          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                            Staff, attendance, payroll and employee sales performance in one place.
                          </p>
                        </div>
                      </div>
                    </div>

                    {isGlobal && (
                      <div className="flex items-center gap-3">
                        <div className="hidden items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400 sm:flex">
                          <Building2 className="h-4 w-4" />
                          Branch
                        </div>
                        <div className="relative">
                          <select
                            value={selectedStoreId || ''}
                            onChange={(event) => setSelectedStoreId(event.target.value ? Number(event.target.value) : null)}
                            disabled={isLoadingStores}
                            className="min-w-52 appearance-none rounded-lg border border-gray-300 bg-white py-2 pl-3 pr-9 text-sm font-medium text-gray-800 outline-none transition focus:border-gray-500 focus:ring-2 focus:ring-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:focus:ring-gray-700"
                          >
                            <option value="">Select branch</option>
                            {availableStores.map((store) => (
                              <option key={store.id} value={store.id}>{store.name}</option>
                            ))}
                          </select>
                          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="overflow-x-auto px-6">
                  <nav className="flex min-w-max gap-1">
                    {filteredTabs.map((tab) => {
                      const Icon = tab.icon;
                      const active = isActive(tab.href);
                      return (
                        <button
                          key={tab.href}
                          onClick={() => router.push(tab.href)}
                          className={`flex items-center gap-2 border-b-2 px-3 py-3 text-sm font-medium transition ${
                            active
                              ? 'border-gray-900 text-gray-900 dark:border-white dark:text-white'
                              : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-800 dark:text-gray-400 dark:hover:border-gray-600 dark:hover:text-gray-200'
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                          {tab.label}
                        </button>
                      );
                    })}
                  </nav>
                </div>
              </div>

              <div className="p-6">{children}</div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

export default function HRMLayout({ children }: { children: React.ReactNode }) {
  return (
    <StoreProvider>
      <HRMLayoutContent>{children}</HRMLayoutContent>
    </StoreProvider>
  );
}
