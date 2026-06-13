'use client';

import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import { useTheme } from '@/contexts/ThemeContext';
import { useState } from 'react';

export default function PosReportFrame({ children }: { children: React.ReactNode }) {
  const { darkMode, setDarkMode } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className={darkMode ? 'dark' : ''}>
      <div className="flex min-h-screen bg-stone-50 dark:bg-gray-950">
        <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <Header toggleSidebar={() => setSidebarOpen(true)} darkMode={darkMode} setDarkMode={setDarkMode} />
          <main className="flex-1 overflow-y-auto">
            <div className="p-4 md:p-6 xl:p-8">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
