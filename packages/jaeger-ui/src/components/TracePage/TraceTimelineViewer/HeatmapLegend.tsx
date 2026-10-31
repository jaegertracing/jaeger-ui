// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import { HEATMAP_STEPS, heatmapColor } from '../../../utils/span-latency-stats';

import './HeatmapLegend.css';

const LABELS = [
  { pos: 0, text: 'Fastest' },
  { pos: 0.5, text: 'Median' },
  { pos: 1, text: 'Slowest' },
];

export default function HeatmapLegend() {
  return (
    <div className="HeatmapLegend" role="group" aria-label="Span latency heatmap legend">
      <span className="HeatmapLegend--title">Latency Heatmap</span>
      <div className="HeatmapLegend--scale">
        <div>
          <div className="HeatmapLegend--bar">
            {Array.from({ length: HEATMAP_STEPS }, (_, i) => (
              <div
                key={i}
                className="HeatmapLegend--segment"
                style={{ backgroundColor: heatmapColor((i + 0.5) / HEATMAP_STEPS) }}
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
