import { HiOutlineUpload } from 'react-icons/hi';

interface ChatDragOverlayProps {
  isDragging: boolean;
}

export default function ChatDragOverlay({ isDragging }: ChatDragOverlayProps) {
  if (!isDragging) return null;

  return (
    <div className="absolute inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
          <HiOutlineUpload className="w-12 h-12 text-primary" />
        </div>
        <div>
          <h3 className="text-2xl font-semibold text-foreground mb-2">Drop files here</h3>
          <p className="text-muted-foreground">Upload datasets or images</p>
        </div>
      </div>
    </div>
  );
}

