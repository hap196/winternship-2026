'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import dynamic from 'next/dynamic';

const PlotlyChart = dynamic(() => import('../charts/PlotlyChart'), { ssr: false });

const PROSE_CLASSES = "prose prose-lg max-w-none text-white prose-p:my-3 prose-p:leading-7 prose-p:text-white prose-headings:font-semibold prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg prose-h1:mb-4 prose-h2:mb-3 prose-h3:mb-2 prose-ul:my-3 prose-ul:text-white prose-ol:my-3 prose-ol:text-white prose-li:my-1 prose-li:text-white prose-table:my-4 prose-th:border prose-th:border-border prose-th:bg-muted prose-th:px-4 prose-th:py-2 prose-td:border prose-td:border-border prose-td:px-4 prose-td:py-2 prose-thead:bg-muted prose-strong:font-semibold prose-strong:text-white prose-headings:text-white prose-code:text-white prose-code:bg-[#3a3a3a] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:font-normal prose-code:before:content-[''] prose-code:after:content-[''] prose-pre:bg-[#3a3a3a] prose-pre:border prose-pre:border-border prose-pre:rounded-lg prose-pre:p-4";

interface MessageContentProps {
  content: string;
  isError?: boolean;
}

function extractPlotlyCharts(content: string): { text: string; charts: any[] } {
  const charts: any[] = [];
  
  // Match both ```plotly and ```json blocks
  const codeBlockPattern = /```(plotly|json)?\s*\n([\s\S]*?)```/g;
  let cleanedContent = content.replace(codeBlockPattern, (match, lang, jsonStr) => {
    try {
      const parsed = JSON.parse(jsonStr);
      
      // Check if it's a Plotly chart (has data and layout, or has type: "plotly")
      if ((parsed.type === 'plotly' && parsed.spec) || (parsed.data && Array.isArray(parsed.data))) {
        const chartData = parsed.spec || parsed;
        charts.push(chartData);
        return '[PLOTLY_CHART]';
      }
    } catch (e) {
      // Not valid JSON or not a Plotly chart, keep original
    }
    return match;
  });

  return { text: cleanedContent, charts };
}

export default function MessageContent({ content, isError }: MessageContentProps) {
  const errorClasses = "text-red-500 prose-p:text-red-500 prose-headings:text-red-500 prose-ul:text-red-500 prose-ol:text-red-500 prose-li:text-red-500 prose-strong:text-red-500 prose-code:text-red-500";
  const currentProseClasses = isError 
    ? PROSE_CLASSES.replace(/text-white/g, '').replace(/prose-.*?:text-white/g, '') + ' ' + errorClasses
    : PROSE_CLASSES;

  const { text, charts } = extractPlotlyCharts(content);
  const parts = text.split('[PLOTLY_CHART]');

  return (
    <div className={currentProseClasses}>
      {parts.map((part, index) => (
        <div key={index}>
          <ReactMarkdown
            remarkPlugins={[remarkGfm, remarkMath]}
            rehypePlugins={[rehypeKatex]}
          >
            {part}
          </ReactMarkdown>
          {charts[index] && (
            <PlotlyChart 
              data={charts[index].data} 
              layout={charts[index].layout}
            />
          )}
        </div>
      ))}
    </div>
  );
}
