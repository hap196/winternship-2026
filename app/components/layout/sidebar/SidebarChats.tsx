'use client';

import { useState } from 'react';
import { 
  HiDotsHorizontal,
  HiTrash,
  HiOutlinePencil,
  HiOutlineFolder,
  HiChevronRight
} from 'react-icons/hi';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Conversation, Project } from '@/app/types';
import { SidebarTypingTitle } from './SidebarTypingTitle';
import { useLanguage } from '../../../providers/LanguageProvider';

interface SidebarChatsProps {
  conversations: Conversation[];
  currentConversationId: string | null;
  typingTitleId: string | null;
  pathname: string;
  onNavigate: (path: string) => void;
  loadConversation: (id: string) => Promise<void>;
  startNewChat: () => void;
  refreshData: () => Promise<void>;
  projects: Project[];
  isProjectContext?: boolean;
  showHeading?: boolean;
}

export const SidebarChats = ({
  conversations,
  currentConversationId,
  typingTitleId,
  pathname,
  onNavigate,
  loadConversation,
  startNewChat,
  refreshData,
  projects,
  isProjectContext = false,
  showHeading = false
}: SidebarChatsProps) => {
  const [openConversationMenu, setOpenConversationMenu] = useState<string | null>(null);
  const [hoveredConversation, setHoveredConversation] = useState<string | null>(null);
  const [renamingConversationId, setRenamingConversationId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [isChatsCollapsed, setIsChatsCollapsed] = useState(false);
  const [hoveredSection, setHoveredSection] = useState<'chats' | null>(null);
  const { t } = useLanguage();

  const handleRenameConversation = async () => {
    if (!renamingConversationId || !renameValue.trim()) return;
    
    try {
      await fetch('/api/conversations/rename', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          conversationId: renamingConversationId, 
          title: renameValue.trim() 
        }),
      });
      await refreshData();
      setRenamingConversationId(null);
      setRenameValue('');
    } catch (error) {
      console.error('Error renaming conversation:', error);
      alert('Failed to rename conversation');
    }
  };

  const handleAssignToProject = async (conversationId: string, projectId: string | null) => {
    try {
      await fetch('/api/conversations/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          conversationId, 
          updates: { projectId } 
        }),
      });
      await refreshData();
    } catch (error) {
      console.error('Error assigning conversation to project:', error);
      alert('Failed to assign conversation to project');
    }
  };

  const renderContent = () => (
    <div className="flex flex-col gap-1">
      <Dialog open={!!renamingConversationId} onOpenChange={(open) => {
        if (!open) {
          setRenamingConversationId(null);
          setRenameValue('');
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('Rename Conversation')}</DialogTitle>
          </DialogHeader>
          <div className="flex gap-2 mt-4">
            <Input
              placeholder={t('Conversation name')}
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleRenameConversation();
                }
              }}
            />
            <Button onClick={handleRenameConversation}>{t('Rename')}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {conversations.map((conversation) => (
        <div
          key={conversation.id}
          className="relative group overflow-hidden"
          onMouseEnter={() => setHoveredConversation(conversation.id)}
          onMouseLeave={() => setHoveredConversation(null)}
        >
          <Button
            variant={conversation.id === currentConversationId && (pathname === '/' || pathname.startsWith('/chat/')) ? "secondary" : "ghost"}
            className={`w-full justify-start text-base text-sidebar-foreground h-11 ${isProjectContext ? 'pl-9 pr-10' : 'pl-3 pr-8'}`}
            onClick={() => {
              onNavigate(`/chat/${conversation.id}`);
            }}
          >
            <span className={`truncate ${isProjectContext ? 'max-w-[190px]' : 'max-w-[240px]'}`}>
              {typingTitleId === conversation.id && conversation.title !== 'New Chat' ? (
                <SidebarTypingTitle title={conversation.title} />
              ) : (
                conversation.title
              )}
            </span>
          </Button>
          
          <DropdownMenu 
            open={openConversationMenu === conversation.id} 
            onOpenChange={(open) => setOpenConversationMenu(open ? conversation.id : null)}
          >
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                className={`absolute right-2 top-1/2 -translate-y-1/2 transition-all duration-200 text-sidebar-foreground ${
                  hoveredConversation === conversation.id || openConversationMenu === conversation.id
                    ? 'opacity-100 visible'
                    : 'opacity-0 invisible'
                }`}
                onClick={(e) => e.stopPropagation()}
              >
                <HiDotsHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuItem onClick={(e) => {
                e.stopPropagation();
                setRenamingConversationId(conversation.id);
                setRenameValue(conversation.title);
              }}>
                <HiOutlinePencil className="w-4 h-4 text-white" />
                <span className="text-base">{t('Rename')}</span>
              </DropdownMenuItem>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <HiOutlineFolder className="w-4 h-4 text-white" />
                  <span className="text-base">{t('Move to project')}</span>
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  {projects.length > 0 ? (
                    projects.map((project) => (
                      <DropdownMenuItem
                        key={project.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAssignToProject(conversation.id, project.id);
                        }}
                      >
                        <HiOutlineFolder className="w-4 h-4 text-white" />
                        <span className="text-base">{project.name}</span>
                      </DropdownMenuItem>
                    ))
                  ) : (
                    <DropdownMenuItem disabled>
                      <span className="text-base text-muted-foreground">No projects</span>
                    </DropdownMenuItem>
                  )}
                  {isProjectContext && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={(e) => {
                        e.stopPropagation();
                        handleAssignToProject(conversation.id, null);
                      }}>
                        <HiOutlineFolder className="w-4 h-4 text-white" />
                        <span className="text-base">{t('Remove from project')}</span>
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={async (e) => {
                  e.stopPropagation();
                  if (window.confirm('Are you sure you want to delete this conversation?')) {
                    try {
                      const isCurrentChat = currentConversationId === conversation.id;
                      await fetch('/api/conversations/delete', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ conversationId: conversation.id }),
                      });
                      await refreshData();
                      if (isCurrentChat) {
                        startNewChat();
                        onNavigate('/chat/new');
                      }
                    } catch (error) {
                      console.error('Error deleting conversation:', error);
                      alert('Failed to delete conversation');
                    }
                  }
                }}
              >
                <HiTrash className="w-4 h-4" />
                <span className="text-base">{t('Delete')}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ))}
    </div>
  );

  if (!showHeading) {
    return renderContent();
  }

  return (
    <>
      <div 
        className="text-sm font-semibold text-sidebar-foreground uppercase tracking-wider px-3 mb-3 cursor-pointer group/section flex items-center gap-2"
        onMouseEnter={() => setHoveredSection('chats')}
        onMouseLeave={() => setHoveredSection(null)}
        onClick={() => setIsChatsCollapsed(!isChatsCollapsed)}
      >
        {t('Chats')}
        <HiChevronRight 
          className={`w-3 h-3 text-sidebar-foreground transition-all ${
            hoveredSection === 'chats' ? 'opacity-100' : 'opacity-0'
          } ${isChatsCollapsed ? '' : 'rotate-90'}`}
        />
      </div>
      {!isChatsCollapsed && renderContent()}
    </>
  );
};
