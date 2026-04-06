'use client';

import { StoreProvider, useStore } from '@/contexts/StoreContext';
import { useAuth } from '@/contexts/AuthContext';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Users, Calendar, Target, Award, ChevronDown } from 'lucide-react';

function HRMLayoutContent({ children }: { children: React.ReactNode }) {
  const { isGlobal, user } = useAuth();
  const { selectedStoreId, setSelectedStoreId, availableStores, isLoadingStores } = useStore();
  const pathname = usePathname();
  const router = useRouter();

  const tabs = [
    { label: 'My HRM', href: '/hrm/my', icon: LayoutDashboard, roles: ['employee', 'pos-salesman', 'branch-manager', 'admin', 'super-admin', 'online-moderator'] },
    { label: 'Staff Attendance', href: '/hrm/branch', icon: Users, roles: ['branch-manager', 'admin', 'super-admin', 'online-moderator'] },
    { label: 'Attendance Reports', href: '/hrm/attendance', icon: Calendar, roles: ['branch-manager', 'admin', 'super-admin', 'online-moderator'] },
    { label: 'Sales Targets', href: '/hrm/sales-targets', icon: Target, roles: ['branch-manager', 'admin', 'super-admin', 'online-moderator'] },
    { label: 'Rewards & Fines', href: '/hrm/rewards-fines', icon: Award, roles: ['branch-manager', 'admin', 'super-admin', 'online-moderator'] },
    { label: 'Payroll', href: '/hrm/payroll', icon: Calendar, roles: ['branch-manager', 'admin', 'super-admin', 'online-moderator'] },
  ];

  const filteredTabs = tabs.filter(tab => {
    if (!user?.role?.slug) return false;
    return tab.roles.includes(user.role.slug);
  });

  return (
    <div className="flex flex-col h-full">
      {/* HRM Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">HRM Management</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Manage attendance, performance, and employee records.</p>
        </div>

        {isGlobal && (
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Viewing Store:</span>
            <div className="relative inline-block text-left">
              <select
                value={selectedStoreId || ''}
                onChange={(e) => setSelectedStoreId(Number(e.target.value))}
                disabled={isLoadingStores}
                className="block w-48 pl-3 pr-10 py-2 text-sm border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-black focus:border-black dark:bg-gray-700 dark:text-white rounded-lg appearance-none cursor-pointer transition-colors"
              >
                <option value="" disabled>Select Store</option>
                {availableStores.map((store) => (
                  <option key={store.id} value={store.id}>
                    {store.name}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700 dark:text-gray-300">
                <ChevronDown className="h-4 w-4" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tabs Navigation */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6">
        <nav className="flex -mb-px space-x-8 overflow-x-auto">
          {filteredTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = pathname === tab.href;
            return (
              <button
                key={tab.href}
                onClick={() => router.push(tab.href)}
                className={`
                  flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-all whitespace-nowrap
                  ${isActive
                    ? 'border-black dark:border-white text-black dark:text-white'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
                  }
                `}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-black dark:text-white' : 'text-gray-400'}`} />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-6 bg-gray-50 dark:bg-gray-900">
        {children}
      </main>
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
