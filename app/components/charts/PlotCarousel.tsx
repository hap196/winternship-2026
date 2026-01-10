'use client';

import { useState, useEffect } from 'react';
import PlotlyChart from './PlotlyChart';
import { HiChevronLeft, HiChevronRight } from 'react-icons/hi';

interface PlotCarouselProps {
  plots: Array<{ data: Plotly.Data[]; layout?: Partial<Plotly.Layout> }>;
}

export default function PlotCarousel({ plots }: PlotCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? plots.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === plots.length - 1 ? 0 : prev + 1));
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        handlePrevious();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [plots.length]);

  if (plots.length === 0) {
    return null;
  }

  if (plots.length === 1) {
    return <PlotlyChart data={plots[0].data} layout={plots[0].layout} />;
  }

  return (
    <div className="relative my-4">
      <PlotlyChart 
        data={plots[currentIndex].data} 
        layout={plots[currentIndex].layout}
      />
      
      <div className="flex items-center justify-center gap-4 mt-4">
        <button
          onClick={handlePrevious}
          className="p-2 rounded-full bg-muted hover:bg-accent transition-colors"
          aria-label="Previous plot"
        >
          <HiChevronLeft className="w-6 h-6" />
        </button>

        <span className="text-sm text-muted-foreground font-medium min-w-[60px] text-center">
          {currentIndex + 1} / {plots.length}
        </span>

        <button
          onClick={handleNext}
          className="p-2 rounded-full bg-muted hover:bg-accent transition-colors"
          aria-label="Next plot"
        >
          <HiChevronRight className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
}
