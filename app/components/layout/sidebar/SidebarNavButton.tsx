import { Button } from '@/components/ui/button';

interface NavButtonProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  active?: boolean;
  shortcut?: string;
}

export const SidebarNavButton = ({ 
  icon: Icon, 
  label, 
  onClick, 
  active = false,
  shortcut
}: NavButtonProps) => (
  <Button
    variant={active ? "secondary" : "ghost"}
    className="w-full justify-between gap-3 text-base h-11"
    onClick={onClick}
  >
    <div className="flex items-center gap-3">
      <Icon className="w-5 h-5" />
      <span>{label}</span>
    </div>
    {shortcut && (
      <span className="text-sm text-muted-foreground">{shortcut}</span>
    )}
  </Button>
);

