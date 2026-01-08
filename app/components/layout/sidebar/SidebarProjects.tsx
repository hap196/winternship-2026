'use client';

import { useState } from 'react';
import { 
  HiOutlineFolder,
  HiOutlineFolderOpen,
  HiDotsHorizontal,
  HiTrash,
  HiChevronRight,
  HiOutlineFolderAdd
} from 'react-icons/hi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Project } from '@/app/types';
import { useLanguage } from '../../../providers/LanguageProvider';
import { SidebarTypingTitle } from './SidebarTypingTitle';
import { SidebarChats } from './SidebarChats';

interface SidebarProjectsProps {
  projects: (Project & { conversations?: any[] })[];
  currentConversationId: string | null;
  typingTitleId: string | null;
  pathname: string;
  onNavigate: (path: string) => void;
  loadConversation: (id: string) => Promise<void>;
  onDeleteProject: (project: { id: string; name: string; chatCount: number }) => void;
  onCreateProject: (name: string) => Promise<void>;
  startNewChat: () => void;
  refreshData: () => Promise<void>;
}

export const SidebarProjects = ({
  projects,
  currentConversationId,
  typingTitleId,
  pathname,
  onNavigate,
  loadConversation,
  onDeleteProject,
  onCreateProject,
  startNewChat,
  refreshData
}: SidebarProjectsProps) => {
  const [isProjectsCollapsed, setIsProjectsCollapsed] = useState(false);
  const [hoveredSection, setHoveredSection] = useState<'projects' | null>(null);
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const { t } = useLanguage();

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;
    await onCreateProject(newProjectName.trim());
    setNewProjectName('');
    setIsCreateProjectOpen(false);
  };

  return (
    <>
      <div 
        className="flex items-center justify-between px-3 mb-3 group/section cursor-pointer"
        onMouseEnter={() => setHoveredSection('projects')}
        onMouseLeave={() => setHoveredSection(null)}
        onClick={() => setIsProjectsCollapsed(!isProjectsCollapsed)}
      >
        <div className="flex items-center gap-2">
          <div className="text-sm font-semibold text-sidebar-foreground uppercase tracking-wider">
            {t('Projects')}
          </div>
          <HiChevronRight 
            className={`w-3 h-3 text-sidebar-foreground transition-all ${
              hoveredSection === 'projects' ? 'opacity-100' : 'opacity-0'
            } ${isProjectsCollapsed ? '' : 'rotate-90'}`}
          />
        </div>
      </div>

      {!isProjectsCollapsed && (
        <div className="flex flex-col gap-1 mb-4">
          <Dialog open={isCreateProjectOpen} onOpenChange={setIsCreateProjectOpen}>
            <DialogTrigger asChild>
              <Button 
                variant="ghost" 
                className="w-full justify-start gap-2 pl-3 pr-8 text-base text-sidebar-foreground hover:bg-sidebar-accent/50 h-11"
              >
                <HiOutlineFolderAdd className="w-4 h-4 flex-shrink-0" />
                <span className="truncate max-w-[240px]">{t('New project')}</span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('New Project')}</DialogTitle>
              </DialogHeader>
              <div className="flex gap-2 mt-4">
                <Input
                  placeholder={t('Project name')}
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleCreateProject();
                    }
                  }}
                />
                <Button onClick={handleCreateProject}>{t('Create')}</Button>
              </div>
            </DialogContent>
          </Dialog>
          {projects.map((project) => {
            const hasConversations = project.conversations && project.conversations.length > 0;
            const hasActiveConversation = hasConversations && project.conversations!.some(
              conv => conv.id === currentConversationId
            );
            const isProjectPageActive = pathname === `/projects/${project.id}`;
            const shouldShowConversations = hasActiveConversation && !isProjectPageActive;

            return (
              <div key={project.id}>
                <div className={`flex items-center gap-2 group/project rounded-md px-3 h-11 cursor-pointer hover:bg-sidebar-accent ${
                  isProjectPageActive ? 'bg-accent' : ''
                }`}
                onClick={() => {
                  onNavigate(`/projects/${project.id}`);
                }}>
                  {shouldShowConversations ? (
                    <HiOutlineFolderOpen className="w-4 h-4 flex-shrink-0 text-sidebar-foreground" />
                  ) : (
                    <HiOutlineFolder className="w-4 h-4 flex-shrink-0 text-sidebar-foreground" />
                  )}
                  <div className="flex-1 text-base text-sidebar-foreground">
                    <span className="truncate">{project.name}</span>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="h-6 w-6 opacity-0 group-hover/project:opacity-100 transition-opacity hover:bg-transparent text-sidebar-foreground"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <HiDotsHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-56">
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          const chatCount = project.conversations?.length || 0;
                          onDeleteProject({
                            id: project.id,
                            name: project.name,
                            chatCount
                          });
                        }}
                      >
                        <HiTrash className="w-4 h-4" />
                        <span className="text-base">{t('Delete')}</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                
                {shouldShowConversations && (
                  <div className="mt-1 flex flex-col gap-1">
                    <SidebarChats
                      conversations={project.conversations || []}
                      currentConversationId={currentConversationId}
                      typingTitleId={typingTitleId}
                      pathname={pathname}
                      onNavigate={onNavigate}
                      loadConversation={loadConversation}
                      startNewChat={startNewChat}
                      refreshData={refreshData}
                      projects={projects}
                      isProjectContext={true}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
};
