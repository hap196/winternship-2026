'use client';

import { HiX, HiDocumentText } from 'react-icons/hi';

interface FileChipProps {
  fileName: string;
  onRemove?: () => void;
}

export default function FileChip({ fileName, onRemove }: FileChipProps) {
  return (
    <div className="inline-flex items-center gap-2 bg-muted border border-border rounded-full px-3 py-1.5 text-sm">
      <HiDocumentText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
      <span className="max-w-xs truncate text-foreground">{fileName}</span>
      {onRemove && (
        <button
          onClick={onRemove}
          className="flex-shrink-0 hover:bg-accent rounded-full p-0.5 transition-colors"
        >
          <HiX className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      )}
    </div>
  );
}

