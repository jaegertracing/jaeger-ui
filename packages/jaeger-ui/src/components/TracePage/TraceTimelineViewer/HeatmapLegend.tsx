// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import { HEATMAP_STEPS, heatmapColor } from '../../../utils/span-latency-stats';

import './HeatmapLegend.css';

const LABELS = [
  { pos: 0, text: '½× median or less' },
  { pos: 0.5, text: 'Median' },
  { pos: 1, text: '2× median or more' },
];

type TProps = {
  // Called with the legend's rendered height whenever it changes, e.g. when the hint wraps.
  onHeightChange?: (height: number) => void;
};

export default function HeatmapLegend({ onHeightChange }: TProps) {
  const ref = React.useRef<HTMLDivElement>(null);

  React.useLayoutEffect(() => {
    const elm = ref.current;
    if (!elm || !onHeightChange) return undefined;
    const report = () => {
      // An element that isn't laid out reports 0; keep the CSS default rather than collapse the space.
      if (elm.offsetHeight > 0) onHeightChange(elm.offsetHeight);
    };
    report();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(report);
    observer.observe(elm);
    return () => observer.disconnect();
  }, [onHeightChange]);

  return (
    <div className="HeatmapLegend" role="group" aria-label="Span latency heatmap legend" ref={ref}>
      <span className="HeatmapLegend--title">Latency Heatmap</span>
      <div className="HeatmapLegend--scale">
        <div>
          <div className="HeatmapLegend--bar">
            {Array.from({ length: HEATMAP_STEPS }, (_, i) => (
              <div
                key={i}
                className="HeatmapLegend--segment"
                style={{ backgroundColor: `var(--heatmap-${i + 1})` }}
                aria-hidden="true"
              />
            ))}
          </div>
          <div className="HeatmapLegend--labels">
            {LABELS.map(({ pos, text }) => (
              <span key={text} className="HeatmapLegend--label" style={{ left: `${pos * 100}%` }}>
                {text}
              </span>
            ))}
          </div>
        </div>
        <span className="HeatmapLegend--noPeers">
          <span
            className="HeatmapLegend--swatch"
            style={{ backgroundColor: heatmapColor(undefined) }}
            aria-hidden="true"
          />
          No peers
        </span>
      </div>
      <div className="HeatmapLegend--hint">Compared with spans of the same service and operation</div>
    </div>
  );
}
