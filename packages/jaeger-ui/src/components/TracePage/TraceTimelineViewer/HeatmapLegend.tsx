// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import { heatmapColor } from '../../../utils/span-latency-stats';

import './HeatmapLegend.css';

const STOPS = 20;
const LABELS = [
  { pos: 0, text: 'Fastest' },
  { pos: 0.5, text: 'Median' },
  { pos: 1, text: 'Slowest' },
];

export default function HeatmapLegend() {
  return (
    <div className="HeatmapLegend" aria-label="Span latency heatmap legend">
      <span className="HeatmapLegend--title">Latency Heatmap</span>
      <div className="HeatmapLegend--bar">
        {Array.from({ length: STOPS }, (_, i) => {
          const score = i / (STOPS - 1);
          return (
            <div
              key={i}
              className="HeatmapLegend--segment"
              style={{ backgroundColor: heatmapColor(score) }}
              aria-hidden="true"
            />
          );
        })}
      </div>
      <div className="HeatmapLegend--labels">
        {LABELS.map(({ pos, text }) => (
          <span key={text} className="HeatmapLegend--label" style={{ left: `${pos * 100}%` }}>
            {text}
          </span>
        ))}
      </div>
      <div className="HeatmapLegend--hint">★ = on critical path (1.5× weight)</div>
    </div>
  );
}
