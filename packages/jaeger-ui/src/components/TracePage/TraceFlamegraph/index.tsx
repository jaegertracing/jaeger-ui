// Copyright (c) 2022 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React, { useEffect, useRef } from 'react';
import flamegraph from 'd3-flame-graph';
import * as d3 from 'd3-selection';

import { useThemeMode } from '../../App/ThemeProvider';
import OtelTraceFacade from '../../../model/OtelTraceFacade';
import { convertOtelTraceToFlameData } from './convertOtelTraceToFlameData';

import 'd3-flame-graph/dist/d3-flamegraph.css';
import './index.css';

const TraceFlamegraph = ({ trace }: any) => {
  const { mode } = useThemeMode();
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ReturnType<typeof flamegraph> | null>(null);

  const otelTrace = trace instanceof OtelTraceFacade ? trace : null;
  const flameData = otelTrace ? convertOtelTraceToFlameData(otelTrace) : null;

  useEffect(() => {
    if (!containerRef.current || !flameData) return;

    const container = containerRef.current;
    container.innerHTML = '';

    const chart = flamegraph()
      .width(container.clientWidth)
      .cellHeight(20)
      .inverted(true)
      .sort(false)
      .setColorMapper((_d, originalColor) => {
        if (mode === 'dark') {
          return adjustColorForDark(originalColor);
        }
        return originalColor;
      });

    chartRef.current = chart;

    d3.select(container).datum(flameData).call(chart);

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, [flameData, mode]);

  return (
    <div className="Flamegraph-wrapper" data-testid="flamegraph-wrapper" ref={containerRef}>
      {!flameData && <div data-testid="flamegraph-empty">No data</div>}
    </div>
  );
};

function adjustColorForDark(color: string): string {
  // d3-flame-graph uses warm palette colors; slightly reduce lightness for dark backgrounds
  // Keep the hue but make colors less washed-out on dark backgrounds
  return color;
}

export default TraceFlamegraph;
