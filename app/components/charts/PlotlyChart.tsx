'use client';

import dynamic from 'next/dynamic';

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

interface PlotlyChartProps {
  data: Plotly.Data[];
  layout?: Partial<Plotly.Layout>;
}

export default function PlotlyChart({ data, layout }: PlotlyChartProps) {
  return (
    <div className="my-4 rounded-lg overflow-hidden">
      <Plot
        data={data}
        layout={{
          autosize: true,
          margin: { l: 60, r: 40, t: 60, b: 80 },
          paper_bgcolor: 'rgba(0,0,0,0)',
          plot_bgcolor: 'rgba(0,0,0,0)',
          font: { color: '#888', size: 12 },
          ...layout,
        }}
        config={{
          responsive: true,
          displayModeBar: true,
          displaylogo: false,
        }}
        style={{ width: '100%', height: '600px' }}
      />
    </div>
  );
}
