// Copyright (c) 2022 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

// Flamegraph view for a trace: renders an interactive d3-flame-graph chart and/or
// a sortable table of aggregated durations, with search highlighting and view toggle.

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import flamegraph from 'd3-flame-graph';
import { select } from 'd3-selection';

import OtelTraceFacade from '../../../model/OtelTraceFacade';
import colorGenerator from '../../../utils/color-generator';
import { convertOtelTraceToFlameData } from './convertOtelTraceToFlameData';
import { generateTableData } from './generateTableData';
import FlamegraphToolbar, { ViewMode } from './FlamegraphToolbar';
import FlamegraphTable from './FlamegraphTable';

import 'd3-flame-graph/dist/d3-flamegraph.css';
import './index.css';

const TraceFlamegraph = ({ trace }: any) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ReturnType<typeof flamegraph> | null>(null);

  const [viewMode, setViewMode] = useState<ViewMode>('both');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [chartZoomed, setChartZoomed] = useState(false);

  const otelTrace = trace instanceof OtelTraceFacade ? trace : null;

  const flameData = useMemo(() => (otelTrace ? convertOtelTraceToFlameData(otelTrace) : null), [otelTrace]);
  const tableData = useMemo(() => (otelTrace ? generateTableData(otelTrace) : []), [otelTrace]);
  const maxSelf = useMemo(() => Math.max(...tableData.map(r => r.self), 1), [tableData]);
  const maxTotal = useMemo(() => Math.max(...tableData.map(r => r.total), 1), [tableData]);

  const isDirty = searchQuery !== '' || selectedItem !== null || chartZoomed;
  const showChart = viewMode === 'flamegraph' || viewMode === 'both';
  const showTable = viewMode === 'table' || viewMode === 'both';

  useEffect(() => {
    if (!containerRef.current || !flameData || !showChart) return;

    const container = containerRef.current;
    container.innerHTML = '';

    const chart = flamegraph()
      .width(container.clientWidth || 800)
      .cellHeight(18)
      .inverted(true)
      .sort(false)
      .transitionDuration(300)
      .onClick((d: any) => {
        setChartZoomed(d?.data?.name !== flameData.name);
      })
      .setColorMapper((d: any) => {
        if (!d || !d.data || !d.data.name) return '#ccc';
        const serviceName = d.data.name.split(': ')[0];
        return colorGenerator.getColorByKey(serviceName);
      });

    chartRef.current = chart;
    select(container).datum(flameData).call(chart);

    return () => {
      chartRef.current = null;
      chart.destroy();
    };
  }, [flameData, showChart]);

  useEffect(() => {
    if (!chartRef.current) return;
    const query = selectedItem || searchQuery;
    if (query) {
      chartRef.current.search(query);
    } else {
      chartRef.current.clear();
    }
  }, [searchQuery, selectedItem]);

  const handleReset = useCallback(() => {
    setSearchQuery('');
    setSelectedItem(null);
    setChartZoomed(false);
    if (chartRef.current) {
      chartRef.current.resetZoom();
      chartRef.current.clear();
    }
  }, []);

  const handleRowClick = useCallback((name: string) => {
    setSelectedItem(prev => (prev === name ? null : name));
  }, []);

  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);
    if (query) setSelectedItem(null);
  }, []);

  if (!otelTrace) {
    return (
      <div className="Flamegraph-wrapper" data-testid="flamegraph-wrapper">
        <div data-testid="flamegraph-empty">No data</div>
      </div>
    );
  }

  return (
    <div className="Flamegraph-wrapper" data-testid="flamegraph-wrapper">
      <FlamegraphToolbar
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        onReset={handleReset}
        isDirty={isDirty}
      />
      <div className="Flamegraph-content" data-view-mode={viewMode}>
        {showTable && (
          <div className="Flamegraph-content--table">
            <FlamegraphTable
              data={tableData}
              searchQuery={searchQuery}
              selectedItem={selectedItem}
              onRowClick={handleRowClick}
              maxSelf={maxSelf}
              maxTotal={maxTotal}
            />
          </div>
        )}
        {showChart && (
          <div className="Flamegraph-content--chart" ref={containerRef} data-testid="flamegraph-chart" />
        )}
      </div>
    </div>
  );
};

export default TraceFlamegraph;
