'use client';

import { useState, useEffect } from 'react';
import { HiOutlineFolder, HiChevronDown, HiDotsHorizontal, HiTrash, HiMenuAlt2, HiChevronRight } from 'react-icons/hi';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useChatContext } from '../../providers/ChatProvider';
import { useSidebar } from '../../providers/SidebarProvider';
import { useRouter } from 'next/navigation';
import { AVAILABLE_MODELS, getModelById, DEFAULT_MODEL } from '../../constants/models';
import { Project } from '../../types';

interface PageHeaderProps {
  projectId?: string;
  showActions?: boolean;
  rightActions?: React.ReactNode;
  onDelete?: () => void;
  title?: string;
}

export default function PageHeader({ 
  projectId,
  showActions = false,
  rightActions,
  onDelete,
  title,
}: PageHeaderProps) {
  const { 
    currentConversationId, 
    selectedModel,
    setSelectedModel,
    startNewChat, 
  } = useChatContext();
  const { isSidebarOpen, toggleSidebar } = useSidebar();
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);
  const modelIdForLabel = mounted ? selectedModel : DEFAULT_MODEL;
  const currentModel = getModelById(modelIdForLabel) || getModelById(DEFAULT_MODEL) || AVAILABLE_MODELS[0];
  const currentProject = projects.find(p => p.id === projectId);

  useEffect(() => {
    const loadProjects = async () => {
      try {
        const response = await fetch('/api/projects/list');
        const { projects: userProjects } = await response.json();
        setProjects(userProjects);
      } catch (error) {
        console.error('Error loading projects:', error);
      }
    };
    loadProjects();
  }, []);

  const handleModelSelect = (modelId: string) => {
    setSelectedModel(modelId);
  };

  const handleProjectSelect = (projectId: string) => {
    router.push(`/projects/${projectId}`);
  };

  const handleDelete = async () => {
    if (!currentConversationId || !onDelete) return;
    
    try {
      await fetch('/api/conversations/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: currentConversationId }),
      });
      startNewChat();
      router.push('/chat/new');
    } catch (error) {
      console.error('Error deleting conversation:', error);
    }
  };

  return (
    <div className="flex items-center justify-between px-6 py-3 border-b bg-background">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {!isSidebarOpen && (
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="h-8 w-8 flex-shrink-0 cursor-e-resize"
          >
            <HiMenuAlt2 className="w-5 h-5" />
          </Button>
        )}
        {projectId && (
          <>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 flex-shrink-0 hover:bg-accent"
                >
                  <HiOutlineFolder className="w-6 h-6 text-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                {projects.length > 0 ? (
                  projects.map((project) => (
                    <DropdownMenuItem
                      key={project.id}
                      onClick={() => handleProjectSelect(project.id)}
                      className={project.id === projectId ? 'bg-accent' : ''}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="text-sm">{project.name}</span>
                        {project.id === projectId && (
                          <HiChevronRight className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                    </DropdownMenuItem>
                  ))
                ) : (
                  <DropdownMenuItem disabled>
                    <span className="text-sm text-muted-foreground">No projects</span>
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            <span className="text-foreground text-base">/</span>
            {currentProject && (
              <>
                <span className="text-base font-medium truncate max-w-[200px]">{currentProject.name}</span>
                <span className="text-foreground text-base">/</span>
              </>
            )}
          </>
        )}
        {title ? (
          <div className="flex items-center gap-1 px-2 py-2 h-auto font-normal text-foreground">
            <span className="text-lg">{title}</span>
          </div>
        ) : (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="flex items-center gap-1 px-2 hover:bg-accent h-auto font-normal text-foreground"
            >
              <span className="text-lg">{currentModel.name}</span>
              <HiChevronDown className="w-5 h-5 text-foreground flex-shrink-0" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64">
            {AVAILABLE_MODELS.map((model) => (
              <DropdownMenuItem
                key={model.id}
                onClick={() => handleModelSelect(model.id)}
                className={model.id === selectedModel ? 'bg-accent' : ''}
              >
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{model.name}</span>
                  <span className="text-xs text-muted-foreground">{model.description}</span>
                </div>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        )}
      </div>

      {/* Right side: Custom actions or default chat actions */}
      <div className="flex items-center gap-2">
        {rightActions ? (
          rightActions
        ) : showActions ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
              >
                <HiDotsHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuItem 
                onClick={onDelete || handleDelete}
                variant="destructive"
              >
                <HiTrash className="w-4 h-4" />
                <span className="text-base">Delete</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>
    </div>
  );
}