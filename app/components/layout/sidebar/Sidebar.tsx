'use client';
import { 
  HiOutlinePlus,
  HiOutlineSearch,
  HiOutlineChevronLeft,
} from 'react-icons/hi';
import { BsLayers } from 'react-icons/bs';
import { useChatContext } from '../../../providers/ChatProvider';
import { useRouter, usePathname } from 'next/navigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import SearchChatsModal from '../../modals/SearchChatsModal';
import { useKeyboardShortcuts } from '../../../hooks/useKeyboardShortcuts';
import { useState, useEffect, useCallback } from 'react';
import { Conversation, Project } from '../../../types';
import { SidebarNavButton } from './SidebarNavButton';
import { SidebarProjects } from './SidebarProjects';
import { SidebarChats } from './SidebarChats';
import { SidebarUserMenu } from './SidebarUserMenu';

interface SidebarProps {
  onNewChat: () => void;
  onNavigate: (path: string) => void;
  currentPath?: string;
  onToggleSidebar?: () => void;
}

const Sidebar = ({ onNewChat, onNavigate, currentPath = '/', onToggleSidebar }: SidebarProps) => {
  const { loadConversation, currentConversationId, startNewChat, refreshConversations, typingTitleId } = useChatContext();
  const router = useRouter();
  const pathname = usePathname();

  const [isSearchChatsOpen, setIsSearchChatsOpen] = useState(false);
  const [deletingProject, setDeletingProject] = useState<{ id: string; name: string; chatCount: number } | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);

  const refreshData = async () => {
    try {
      const [convResponse, projResponse] = await Promise.all([
        fetch('/api/conversations/list'),
        fetch('/api/projects/list'),
      ]);
      const { conversations: convs } = await convResponse.json();
      const { projects: projs } = await projResponse.json();
      setConversations(convs);
      setProjects(projs);
    } catch (error) {
      console.error('Error fetching sidebar data:', error);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      refreshData();
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleCreateProject = async (name: string) => {
    try {
      const response = await fetch('/api/projects/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const { project } = await response.json();
      await refreshData();
      onNavigate(`/projects/${project.id}`);
    } catch (error) {
      console.error('Error creating project:', error);
      alert('Failed to create project');
    }
  };

  const handleDeleteProject = async () => {
    if (!deletingProject) return;
    
    try {
      await fetch('/api/projects/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: deletingProject.id }),
      });
      await refreshData();
      setDeletingProject(null);
    } catch (error) {
      console.error('Error deleting project:', error);
      alert('Failed to delete project');
    }
  };

  const handleNewChatShortcut = useCallback(() => {
    onNewChat();
  }, [onNewChat]);

  const handleSearchShortcut = useCallback(() => {
    setIsSearchChatsOpen(true);
  }, []);

  useKeyboardShortcuts([
    {
      key: 'o',
      metaKey: true,
      ctrlKey: true,
      shiftKey: true,
      callback: handleNewChatShortcut,
      description: 'New chat'
    },
    {
      key: 'k',
      metaKey: true,
      ctrlKey: true,
      callback: handleSearchShortcut,
      description: 'Search chats'
    }
  ]);

  return (
    <div className="w-full bg-sidebar flex flex-col h-screen border-r border-sidebar-border">
      <Dialog open={!!deletingProject} onOpenChange={(open) => {
        if (!open) {
          setDeletingProject(null);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete project?</DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            {deletingProject && deletingProject.chatCount > 0 ? (
              <>
                <p className="text-foreground">
                  This will permanently delete the project.
                </p>
                <p className="text-muted-foreground mt-2">
                  {deletingProject.chatCount} chats will be moved to your main chat list and not deleted.
                </p>
              </>
            ) : (
              <p className="text-foreground">
                This will permanently delete the project.
              </p>
            )}
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <Button variant="ghost" onClick={() => setDeletingProject(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteProject}>
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="px-2 py-5">
        <div className="flex items-center justify-between gap-3 h-11 px-4">
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="currentColor" fillOpacity="0.3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          {onToggleSidebar && (
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onToggleSidebar();
              }}
              className="hover:bg-sidebar-accent text-sidebar-foreground cursor-w-resize"
            >
              <HiOutlineChevronLeft className="w-5 h-5" />
            </Button>
          )}
        </div>
      </div>

      <div className="px-2 flex flex-col gap-1">
        <SidebarNavButton 
          icon={HiOutlinePlus} 
          label="New chat"
          onClick={onNewChat}
          shortcut={typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0 ? '⌘⇧O' : 'Ctrl+Shift+O'}
        />
        <SidebarNavButton 
          icon={HiOutlineSearch} 
          label="Search chats"
          onClick={() => setIsSearchChatsOpen(true)}
          shortcut={typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0 ? '⌘K' : 'Ctrl+K'}
        />
      </div>

      <SearchChatsModal 
        isOpen={isSearchChatsOpen} 
        onClose={() => setIsSearchChatsOpen(false)} 
      />

      <div className="h-px bg-sidebar-border my-4 mx-2"></div>

      <ScrollArea className="flex-1 px-2 w-full">
        <SidebarProjects 
          projects={projects}
          currentConversationId={currentConversationId}
          typingTitleId={typingTitleId}
          pathname={pathname || ''}
          onNavigate={onNavigate}
          loadConversation={loadConversation}
          onDeleteProject={setDeletingProject}
          onCreateProject={handleCreateProject}
          startNewChat={startNewChat}
          refreshData={refreshData}
        />

        <SidebarChats 
          conversations={conversations}
          currentConversationId={currentConversationId}
          typingTitleId={typingTitleId}
          pathname={pathname || ''}
          onNavigate={onNavigate}
          loadConversation={loadConversation}
          startNewChat={startNewChat}
          refreshData={refreshData}
          projects={projects}
          showHeading={true}
        />
      </ScrollArea>

      <SidebarUserMenu 
        onNavigate={onNavigate}
      />
    </div>
  );
};

export default Sidebar;

