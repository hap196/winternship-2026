'use client';

import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

interface TypingMessageProps {
  content: string;
}

const PROSE_CLASSES = "prose prose-lg max-w-none text-white prose-p:my-3 prose-p:leading-7 prose-p:text-white prose-headings:font-semibold prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg prose-h1:mb-4 prose-h2:mb-3 prose-h3:mb-2 prose-ul:my-3 prose-ul:text-white prose-ol:my-3 prose-ol:text-white prose-li:my-1 prose-li:text-white prose-table:my-4 prose-th:border prose-th:border-border prose-th:bg-muted prose-th:px-4 prose-th:py-2 prose-td:border prose-td:border-border prose-td:px-4 prose-td:py-2 prose-thead:bg-muted prose-strong:font-semibold prose-strong:text-white prose-headings:text-white prose-code:text-white prose-code:bg-[#3a3a3a] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:font-normal prose-code:before:content-[''] prose-code:after:content-[''] prose-pre:bg-[#3a3a3a] prose-pre:border prose-pre:border-border prose-pre:rounded-lg prose-pre:p-4";

export const TypingMessage = ({ content }: TypingMessageProps) => {
  const [displayedContent, setDisplayedContent] = useState('');

  useEffect(() => {
    if (displayedContent.length < content.length) {
      const timeout = setTimeout(() => {
        setDisplayedContent(content.slice(0, displayedContent.length + 1));
      }, 5); // Very fast typing speed

      return () => clearTimeout(timeout);
    }
  }, [displayedContent, content]);

  return (
    <div className={PROSE_CLASSES}>
      <ReactMarkdown 
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
      >
        {displayedContent}
      </ReactMarkdown>
    </div>
  );
};
