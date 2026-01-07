'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useChatContext } from '../providers/ChatProvider';
import { useSidebar } from '../providers/SidebarProvider';
import Sidebar from './layout/sidebar/Sidebar';
import { ReactNode, useEffect } from 'react';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { startNewChat } = useChatContext();
  const { isSidebarOpen, toggleSidebar } = useSidebar();

  useEffect(() => {
    if (isSidebarOpen && window.innerWidth < 1024) {
      toggleSidebar();
    }
  }, [pathname, isSidebarOpen, toggleSidebar]);

  const handleNewChat = () => {
    startNewChat();
    router.push('/chat/new');
  };

  const handleNavigation = (path: string) => {
    router.push(path);
  };

  return (
    <div className="flex h-screen w-full bg-background">
      <div 
        className={`flex-shrink-0 transition-all duration-300 ease-in-out lg:relative absolute inset-y-0 z-50 overflow-hidden ${
          isSidebarOpen ? 'w-[300px] left-0' : 'w-[300px] -left-[300px] lg:w-0 lg:left-0'
        }`}
      >
        <div className="w-[300px] h-full">
          <Sidebar 
            onNewChat={handleNewChat} 
            onNavigate={handleNavigation}
            currentPath={pathname || '/'}
            onToggleSidebar={toggleSidebar}
          />
        </div>
      </div>

      <div 
        className={`fixed inset-0 bg-black/50 z-40 lg:hidden transition-opacity duration-300 ${
          isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={toggleSidebar}
      />
      
      <div className="flex flex-1 flex-col bg-background overflow-y-auto relative w-full">
        {children}
      </div>
    </div>
  );
}

