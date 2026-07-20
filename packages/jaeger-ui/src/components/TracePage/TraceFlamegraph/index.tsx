// Copyright (c) 2022 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Tooltip } from 'antd';
import flamegraph from 'd3-flame-graph';
import { select } from 'd3-selection';
import { IoHelp } from 'react-icons/io5';

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
import VerticalResizer from '../../common/VerticalResizer';

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

// Smallest gap (px) to leave to the right of the fixed first column when the table is at its
// minimum width, so a sliver of the scrollable columns stays visible.
const TABLE_MIN_GUTTER_PX = 16;

const TraceFlamegraph = ({ trace }: any) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ReturnType<typeof flamegraph> | null>(null);
  const searchActiveRef = useRef(false);
  const zoomedNodeRef = useRef<any>(null);
  const hoveredFrameRef = useRef<Element | null>(null);

  const [viewMode, setViewMode] = useState<ViewMode>('both');
  // Fraction of the content width allotted to the table in "both" mode (rest goes to the chart).
  const [tableWidth, setTableWidth] = useState(0.5);
  // Lower bound for the table fraction, derived from the (fixed) first column's width so the
  // resizer can't shrink the table narrower than the Service & Operation column.
  const [tableMinFraction, setTableMinFraction] = useState(0.2);
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
    if (!showChart) {
      setContextMenu(null);
      setTooltip(null);
    }
  }, [showChart]);

  useEffect(() => {
    if (!containerRef.current || !flameData || !showChart) return;

    setChartZoomed(false);
    zoomedNodeRef.current = null;

    const container = containerRef.current;
    container.innerHTML = '';

    const rootFrameColor =
      getComputedStyle(container).getPropertyValue('--border-strongest').trim() || '#ccc';
    const rootValue = flameData.duration ?? flameData.value;
    const chart = flamegraph()
      .width(container.clientWidth || 800)
      .cellHeight(18)
      .inverted(true)
      .sort(false)
      .selfValue(false)
      .transitionDuration(300)
      .onClick((d: any) => {
        const isRoot = !d.parent;
        setChartZoomed(!isRoot);
        zoomedNodeRef.current = isRoot ? null : d.data;
      })
      .setColorMapper((d: any, _originalColor: string) => {
        if (d.highlight) return HIGHLIGHT_COLOR;
        if (!d || !d.data || !d.data.serviceName) return rootFrameColor;
        const { serviceName } = d.data;
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
        return d.data.name.toLowerCase().includes(term.toLowerCase());
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
          if (hoveredFrameRef.current) {
            hoveredFrameRef.current = null;
            setTooltip(null);
          }
          return;
        }
        if (target === hoveredFrameRef.current) return;
        hoveredFrameRef.current = target;
        const d3Data = (target as any).__data__;
        const name = d3Data?.data?.name || '';
        const value = d3Data?.data?.duration ?? d3Data?.data?.value ?? 0;
        const count = d3Data?.data?.count || 1;
        setTooltip({ x: e.clientX, y: e.clientY, name, value, count });
      });
      svgEl.addEventListener('mouseleave', () => {
        hoveredFrameRef.current = null;
        setTooltip(null);
      });
    }

    return () => {
      chartRef.current = null;
      chart.destroy();
    };
  }, [flameData, showChart, viewMode]);

  useEffect(() => {
    const query = selectedItem || searchQuery;
    searchActiveRef.current = Boolean(query);
    if (!chartRef.current) return;
    if (query) {
      chartRef.current.search(query);
    } else {
      chartRef.current.clear();
    }
  }, [searchQuery, selectedItem, viewMode]);

  // Re-fit the chart to its new width after the split is dragged (onChange fires once, on drag end).
  useEffect(() => {
    if (!showChart || !chartRef.current || !containerRef.current || !flameData) return;
    chartRef.current.width(containerRef.current.clientWidth || 800);
    select(containerRef.current).datum(flameData).call(chartRef.current);
  }, [tableWidth, showChart, flameData]);

  // Keep the resizer's minimum tied to the fixed first column's width, recomputing on layout
  // changes (mode switch, data change, window resize). Without this the table could be dragged
  // narrower than the pinned column, making the horizontal scroll behave erratically.
  useLayoutEffect(() => {
    if (viewMode !== 'both') return undefined;
    const measure = () => {
      const content = contentRef.current;
      if (!content) return;
      const contentW = content.clientWidth;
      const firstCol = content.querySelector<HTMLElement>('.Flamegraph-content--table thead th');
      const colW = firstCol ? firstCol.getBoundingClientRect().width : 0;
      if (contentW > 0 && colW > 0) {
        setTableMinFraction(Math.min(0.6, (colW + TABLE_MIN_GUTTER_PX) / contentW));
      }
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [viewMode, tableData]);

  // Clamp the current split into the allowed range whenever the minimum changes.
  useEffect(() => {
    setTableWidth(w => Math.min(0.8, Math.max(tableMinFraction, w)));
  }, [tableMinFraction]);

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
      navigator.clipboard?.writeText(rawName).catch(() => {});
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
      <div className="Flamegraph-content" data-view-mode={viewMode} ref={contentRef}>
        {showTable && (
          <div
            className="Flamegraph-content--table"
            style={
              viewMode === 'both'
                ? { flex: `0 0 ${tableWidth * 100}%`, maxWidth: `${tableWidth * 100}%` }
                : undefined
            }
          >
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
        {viewMode === 'both' && (
          <VerticalResizer min={tableMinFraction} max={0.8} position={tableWidth} onChange={setTableWidth} />
        )}
        {showChart && (
          <div className="Flamegraph-content--chart-wrapper">
            <div className="Flamegraph-content--chart-caption">
              Shows total resource cost per operation (not wall-clock critical path)
              <Tooltip
                trigger={['hover', 'focus']}
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
                <span
                  className="Flamegraph-content--chart-help"
                  role="button"
                  tabIndex={0}
                  aria-label="Flamegraph explanation"
                >
                  <IoHelp />
                </span>
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
          onReset={() => {
            handleReset();
            setContextMenu(null);
          }}
          onCollapseAbove={() => {
            handleCollapseAbove();
            setContextMenu(null);
          }}
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
