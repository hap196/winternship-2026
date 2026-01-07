'use client';

import { useState, useEffect } from 'react';

export const SidebarTypingTitle = ({ title }: { title: string }) => {
  const [displayedTitle, setDisplayedTitle] = useState('');

  useEffect(() => {
    if (displayedTitle.length < title.length) {
      const timeout = setTimeout(() => {
        setDisplayedTitle(title.slice(0, displayedTitle.length + 1));
      }, 30);
      return () => clearTimeout(timeout);
    }
  }, [displayedTitle, title]);

  return <span>{displayedTitle}</span>;
};

