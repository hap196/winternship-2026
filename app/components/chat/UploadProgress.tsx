'use client';

import { HiX, HiDocumentText } from 'react-icons/hi';

interface UploadProgressProps {
  fileName: string;
  progress: number;
  onCancel: () => void;
}

export default function UploadProgress({ fileName, progress, onCancel }: UploadProgressProps) {
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-background/80 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-2xl shadow-lg p-4 w-full max-w-md mx-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
            <HiDocumentText className="w-6 h-6 text-muted-foreground" />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-foreground truncate">
                  {fileName}
                </div>
                <div className="text-xs text-muted-foreground">
                  {progress < 100 ? `Uploading... ${progress}%` : 'Complete'}
                </div>
              </div>
              <button
                onClick={onCancel}
                className="flex-shrink-0 p-1 hover:bg-accent rounded-full transition-colors"
              >
                <HiX className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            
            <div className="w-full bg-secondary rounded-full h-1.5 mt-2">
              <div 
                className="bg-primary h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

