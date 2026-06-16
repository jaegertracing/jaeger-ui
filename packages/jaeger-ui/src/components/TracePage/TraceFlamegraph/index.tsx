// Copyright (c) 2022 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Tooltip } from 'antd';
import flamegraph from 'd3-flame-graph';
import { select } from 'd3-selection';

import OtelTraceFacade from '../../../model/OtelTraceFacade';
import colorGenerator from '../../../utils/color-generator';
import { formatDuration, formatDurationCompact } from '../../../utils/date';
import { Microseconds } from '../../../types/units';
import { convertOtelTraceToFlameData } from './convertOtelTraceToFlameData';
import { generateTableData } from './generateTableData';
import FlamegraphToolbar, { ViewMode } from './FlamegraphToolbar';
import FlamegraphTable from './FlamegraphTable';
import FlamegraphContextMenu from './FlamegraphContextMenu';
import FlamegraphTooltip from './FlamegraphTooltip';

import 'd3-flame-graph/dist/d3-flamegraph.css';
import './index.css';

interface ContextMenuState {
  x: number;
  y: number;
  name: string;
}

interface TooltipState {
  x: number;
  y: number;
  name: string;
  value: number;
  count: number;
}

const HIGHLIGHT_COLOR = '#E600E6';

const TraceFlamegraph = ({ trace }: any) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ReturnType<typeof flamegraph> | null>(null);
  const searchActiveRef = useRef(false);
  const zoomedNodeRef = useRef<any>(null);

  const [viewMode, setViewMode] = useState<ViewMode>('both');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [chartZoomed, setChartZoomed] = useState(false);
  const [collapsedRoot, setCollapsedRoot] = useState<any>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const otelTrace = trace instanceof OtelTraceFacade ? trace : null;

  const fullFlameData = useMemo(
    () => (otelTrace ? convertOtelTraceToFlameData(otelTrace) : null),
    [otelTrace]
  );
  const flameData = collapsedRoot || fullFlameData;
  const tableData = useMemo(() => (otelTrace ? generateTableData(otelTrace) : []), [otelTrace]);
  const maxSelf = useMemo(() => Math.max(...tableData.map(r => r.self), 1), [tableData]);
  const maxTotal = useMemo(() => Math.max(...tableData.map(r => r.total), 1), [tableData]);

  const isDirty = searchQuery !== '' || selectedItem !== null || chartZoomed || collapsedRoot !== null;
  const showChart = viewMode === 'flamegraph' || viewMode === 'both';
  const showTable = viewMode === 'table' || viewMode === 'both';

  useEffect(() => {
    if (!containerRef.current || !flameData || !showChart) return;

    const container = containerRef.current;
    container.innerHTML = '';

    const rootValue = flameData.duration ?? flameData.value;
    const chart = flamegraph()
      .width(container.clientWidth || 800)
      .cellHeight(18)
      .inverted(true)
      .sort(false)
      .selfValue(false)
      .transitionDuration(300)
      .onClick((d: any) => {
        const isRoot = d?.data?.name === flameData.name;
        setChartZoomed(!isRoot);
        zoomedNodeRef.current = isRoot ? null : d.data;
      })
      .setColorMapper((d: any, _originalColor: string) => {
        if (d.highlight) return HIGHLIGHT_COLOR;
        if (!d || !d.data || !d.data.name) return '#ccc';
        const serviceName = d.data.name.split(': ')[0];
        if (searchActiveRef.current) {
          const [r, g, b] = colorGenerator.getRgbColorByKey(serviceName);
          return `rgba(${r}, ${g}, ${b}, 0.3)`;
        }
        return colorGenerator.getColorByKey(serviceName);
      })
      .getName((d: any) => {
        if (!d || !d.data) return '';
        const duration = d.data.duration ?? d.data.value;
        const pct = rootValue > 0 ? ((duration / rootValue) * 100).toFixed(2) : '0';
        const dur = formatDurationCompact(duration as Microseconds);
        return `${d.data.name} (${pct}%, ${dur})`;
      })
      .setLabelHandler((d: any) => {
        if (!d || !d.data) return '';
        const duration = d.data.duration ?? d.data.value;
        const pct = rootValue > 0 ? ((duration / rootValue) * 100).toFixed(2) : '0';
        const dur = formatDuration(duration as Microseconds);
        return `${d.data.name} (${pct}%, ${dur})`;
      })
      .setSearchMatch((d: any, term: string) => {
        if (!term || !d?.data?.name) return false;
        const re = new RegExp(term);
        return Boolean(d.data.name.match(re));
      });

    chartRef.current = chart;
    select(container).datum(flameData).call(chart);

    const svgEl = container.querySelector('svg');
    if (svgEl) {
      svgEl.addEventListener('contextmenu', (e: MouseEvent) => {
        const target = (e.target as Element).closest('g.frame');
        if (!target) return;
        e.preventDefault();
        const name = target.getAttribute('name') || '';
        setContextMenu({ x: e.clientX, y: e.clientY, name });
        setTooltip(null);
      });
      svgEl.addEventListener('mousemove', (e: MouseEvent) => {
        const target = (e.target as Element).closest('g.frame');
        if (!target) {
          setTooltip(null);
          return;
        }
        const d3Data = (target as any).__data__;
        const name = d3Data?.data?.name || '';
        const value = d3Data?.data?.duration ?? d3Data?.data?.value ?? 0;
        const count = d3Data?.data?.count || 1;
        setTooltip({ x: e.clientX, y: e.clientY, name, value, count });
      });
      svgEl.addEventListener('mouseleave', () => {
        setTooltip(null);
      });
    }

    return () => {
      chartRef.current = null;
      chart.destroy();
    };
  }, [flameData, showChart, viewMode]);

  useEffect(() => {
    if (!chartRef.current) return;
    const query = selectedItem || searchQuery;
    if (query) {
      searchActiveRef.current = true;
      chartRef.current.search(query);
    } else {
      searchActiveRef.current = false;
      chartRef.current.clear();
    }
  }, [searchQuery, selectedItem, viewMode]);

  const handleReset = useCallback(() => {
    setSearchQuery('');
    setSelectedItem(null);
    setChartZoomed(false);
    setCollapsedRoot(null);
    zoomedNodeRef.current = null;
    if (chartRef.current) {
      chartRef.current.resetZoom();
      chartRef.current.clear();
    }
  }, []);

  const handleCollapseAbove = useCallback(() => {
    if (zoomedNodeRef.current) {
      setCollapsedRoot(zoomedNodeRef.current);
      zoomedNodeRef.current = null;
    }
    setChartZoomed(false);
  }, []);

  const handleRowClick = useCallback((name: string) => {
    setSelectedItem(prev => (prev === name ? null : name));
  }, []);

  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);
    if (query) setSelectedItem(null);
  }, []);

  const handleContextMenuClose = useCallback(() => {
    setContextMenu(null);
  }, []);

  const handleCopyName = useCallback(() => {
    if (contextMenu) {
      const rawName = contextMenu.name.replace(/\s*\([^)]*%,\s*[^)]*\)\s*$/, '');
      navigator.clipboard.writeText(rawName);
    }
    setContextMenu(null);
  }, [contextMenu]);

  const handleHighlightSimilar = useCallback(() => {
    if (contextMenu) {
      const rawName = contextMenu.name.replace(/\s*\([^)]*%,\s*[^)]*\)\s*$/, '');
      setSelectedItem(rawName);
      setSearchQuery('');
    }
    setContextMenu(null);
  }, [contextMenu]);

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
        chartZoomed={chartZoomed}
        onCollapseAbove={handleCollapseAbove}
        showChart={showChart}
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
          <div className="Flamegraph-content--chart-wrapper">
            <div className="Flamegraph-content--chart-caption">
              Shows total resource cost per operation (not wall-clock critical path)
              <Tooltip
                title={
                  <span>
                    This flamegraph aggregates spans by service and operation, summing their durations. It
                    answers &quot;how much total work does this request generate?&quot; — useful for spotting
                    N+1 calls, redundant operations, and disproportionately expensive subtrees.
                    <br />
                    <br />
                    Parallel spans are summed, so frame widths may exceed the parent span&apos;s wall-clock
                    duration. For latency analysis (&quot;why is this request slow?&quot;), use the Timeline
                    view with critical path highlighting.
                  </span>
                }
              >
                <span className="Flamegraph-content--chart-help">?</span>
              </Tooltip>
            </div>
            <div className="Flamegraph-content--chart" ref={containerRef} data-testid="flamegraph-chart" />
          </div>
        )}
      </div>
      {contextMenu && (
        <FlamegraphContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onReset={handleReset}
          onCollapseAbove={handleCollapseAbove}
          onCopyName={handleCopyName}
          onHighlightSimilar={handleHighlightSimilar}
          onClose={handleContextMenuClose}
          isDirty={isDirty}
          chartZoomed={chartZoomed}
        />
      )}
      {tooltip && !contextMenu && (
        <FlamegraphTooltip
          x={tooltip.x}
          y={tooltip.y}
          name={tooltip.name}
          value={tooltip.value}
          count={tooltip.count}
          rootValue={flameData?.duration ?? flameData?.value ?? 1}
        />
      )}
    </div>
  );
};

export default TraceFlamegraph;
