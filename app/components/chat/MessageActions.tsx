'use client';

import { useState } from 'react';
import { 
  HiOutlineClipboardCopy, 
  HiOutlineThumbUp, 
  HiOutlineThumbDown, 
  HiCheck
} from 'react-icons/hi';

interface MessageActionsProps {
  messageContent: string;
}

export const MessageActions = ({ 
  messageContent
}: MessageActionsProps) => {
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null);
  const [hoveredAction, setHoveredAction] = useState<'copy' | 'up' | 'down' | null>(null);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(messageContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  const handleThumbsUp = () => {
    setFeedback(feedback === 'up' ? null : 'up');
  };

  const handleThumbsDown = () => {
    setFeedback(feedback === 'down' ? null : 'down');
  };

  return (
    <div className="flex items-center gap-1 mt-3 -ml-2">
      <div className="relative">
        <button
          onClick={handleCopy}
          onMouseEnter={() => setHoveredAction('copy')}
          onMouseLeave={() => setHoveredAction(null)}
          className={`p-2 rounded-lg transition-colors ${
            copied ? 'text-green-400 cursor-default' : 'text-foreground hover:bg-accent cursor-pointer'
          }`}
        >
          {copied ? (
            <HiCheck className="w-5 h-5" />
          ) : (
            <HiOutlineClipboardCopy className="w-5 h-5" />
          )}
        </button>
        {hoveredAction === 'copy' && !copied && (
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-1.5 bg-black text-white text-xs rounded-lg whitespace-nowrap z-50">
            Copy
          </div>
        )}
      </div>
      <div className="relative">
        <button
          onClick={handleThumbsUp}
          onMouseEnter={() => setHoveredAction('up')}
          onMouseLeave={() => setHoveredAction(null)}
          className={`p-2 rounded-lg transition-colors cursor-pointer ${
            feedback === 'up' ? 'text-green-400 bg-accent' : 'text-foreground hover:bg-accent'
          }`}
        >
          <HiOutlineThumbUp className="w-5 h-5" />
        </button>
        {hoveredAction === 'up' && (
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-1.5 bg-black text-white text-xs rounded-lg whitespace-nowrap z-50">
            Good response
          </div>
        )}
      </div>
      <div className="relative">
        <button
          onClick={handleThumbsDown}
          onMouseEnter={() => setHoveredAction('down')}
          onMouseLeave={() => setHoveredAction(null)}
          className={`p-2 rounded-lg transition-colors cursor-pointer ${
            feedback === 'down' ? 'text-red-400 bg-accent' : 'text-foreground hover:bg-accent'
          }`}
        >
          <HiOutlineThumbDown className="w-5 h-5" />
        </button>
        {hoveredAction === 'down' && (
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-1.5 bg-black text-white text-xs rounded-lg whitespace-nowrap z-50">
            Bad response
          </div>
        )}
      </div>
    </div>
  );
};

