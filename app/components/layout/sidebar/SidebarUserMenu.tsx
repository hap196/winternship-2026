'use client';

import { HiOutlineUser } from 'react-icons/hi';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface SidebarUserMenuProps {
  onNavigate: (path: string) => void;
}

export const SidebarUserMenu = ({ onNavigate }: SidebarUserMenuProps) => {
  return (
    <div className="p-2 border-t border-sidebar-border">
      <Button variant="ghost" className="w-full justify-start gap-3 h-auto py-3 px-2" disabled>
        <div className="relative rounded-full hover:bg-accent/50 transition-colors p-0.5">
          <Avatar className="size-9">
            <AvatarFallback className="bg-primary text-primary-foreground">
              <HiOutlineUser className="w-5 h-5" />
            </AvatarFallback>
          </Avatar>
        </div>
        <div className="flex-1 min-w-0 text-left">
          <div className="text-base font-medium truncate">
            Guest User
          </div>
          <div className="text-sm text-muted-foreground truncate">
            Session Active
          </div>
        </div>
      </Button>
    </div>
  );
};

