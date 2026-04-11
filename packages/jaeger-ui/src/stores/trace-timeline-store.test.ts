// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  getInitialLayoutState,
  SIDE_PANEL_WIDTH_MAX,
  SIDE_PANEL_WIDTH_MIN,
  SPAN_NAME_COLUMN_WIDTH_MAX,
  SPAN_NAME_COLUMN_WIDTH_MIN,
  useTraceTimelineStore,
} from './trace-timeline-store';

vi.mock('../utils/config/get-config', () => ({
  default: vi.fn(() => ({})),
}));

import getConfig from '../utils/config/get-config';

describe('getInitialLayoutState()', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(getConfig).mockReturnValue({} as ReturnType<typeof getConfig>);
  });

  it('returns default values when localStorage is empty and config has no traceTimeline', () => {
    const state = getInitialLayoutState();
    expect(state.spanNameColumnWidth).toBe(0.25);
    expect(state.timelineBarsVisible).toBe(true);
    expect(state.detailPanelMode).toBe('inline');
    expect(state.sidePanelWidth).toBeCloseTo(0.375);
  });

  it('reads spanNameColumnWidth from localStorage', () => {
    localStorage.setItem('spanNameColumnWidth', '0.4');
    const state = getInitialLayoutState();
    expect(state.spanNameColumnWidth).toBeCloseTo(0.4);
  });

  it('clamps spanNameColumnWidth to [MIN, MAX]', () => {
    localStorage.setItem('spanNameColumnWidth', '0.01');
    expect(getInitialLayoutState().spanNameColumnWidth).toBe(SPAN_NAME_COLUMN_WIDTH_MIN);

    localStorage.setItem('spanNameColumnWidth', '0.99');
    expect(getInitialLayoutState().spanNameColumnWidth).toBe(SPAN_NAME_COLUMN_WIDTH_MAX);
  });

  it('reads sidePanelWidth from localStorage', () => {
    localStorage.setItem('spanNameColumnWidth', '0.25');
    localStorage.setItem('sidePanelWidth', '0.3');
    const state = getInitialLayoutState();
    expect(state.sidePanelWidth).toBeCloseTo(0.3);
  });

  it('clamps sidePanelWidth to [MIN, MAX]', () => {
    localStorage.setItem('sidePanelWidth', '0.01');
    expect(getInitialLayoutState().sidePanelWidth).toBe(SIDE_PANEL_WIDTH_MIN);

    localStorage.setItem('sidePanelWidth', '0.99');
    expect(getInitialLayoutState().sidePanelWidth).toBe(SIDE_PANEL_WIDTH_MAX);
  });

  it('resets sidePanelWidth when sum with spanNameColumnWidth >= 1', () => {
    localStorage.setItem('spanNameColumnWidth', '0.6');
    localStorage.setItem('sidePanelWidth', '0.6');
    const state = getInitialLayoutState();
    expect(state.spanNameColumnWidth + state.sidePanelWidth).toBeLessThan(1);
  });

  it('resets both widths when no combination leaves room', () => {
    localStorage.setItem('spanNameColumnWidth', '0.85');
    localStorage.setItem('sidePanelWidth', '0.7');
    const state = getInitialLayoutState();
    expect(state.spanNameColumnWidth + state.sidePanelWidth).toBeLessThan(1);
  });

  it('reads timelineBarsVisible=false from localStorage', () => {
    localStorage.setItem('timelineVisible', 'false');
    expect(getInitialLayoutState().timelineBarsVisible).toBe(false);
  });

  it('reads timelineBarsVisible=true from localStorage when value is not "false"', () => {
    localStorage.setItem('timelineVisible', 'true');
    expect(getInitialLayoutState().timelineBarsVisible).toBe(true);
  });

  it('defaults detailPanelMode to inline when enableSidePanel is false', () => {
    vi.mocked(getConfig).mockReturnValue({
      traceTimeline: { enableSidePanel: false },
    } as ReturnType<typeof getConfig>);
    expect(getInitialLayoutState().detailPanelMode).toBe('inline');
  });

  it('reads detailPanelMode=sidepanel from localStorage when enableSidePanel is true', () => {
    vi.mocked(getConfig).mockReturnValue({
      traceTimeline: { enableSidePanel: true },
    } as ReturnType<typeof getConfig>);
    localStorage.setItem('detailPanelMode', 'sidepanel');
    expect(getInitialLayoutState().detailPanelMode).toBe('sidepanel');
  });

  it('uses defaultDetailPanelMode from config when localStorage is empty and enableSidePanel is true', () => {
    vi.mocked(getConfig).mockReturnValue({
      traceTimeline: { enableSidePanel: true, defaultDetailPanelMode: 'sidepanel' },
    } as ReturnType<typeof getConfig>);
    expect(getInitialLayoutState().detailPanelMode).toBe('sidepanel');
  });

  it('keeps detailPanelMode=inline when stored value is not sidepanel', () => {
    vi.mocked(getConfig).mockReturnValue({
      traceTimeline: { enableSidePanel: true },
    } as ReturnType<typeof getConfig>);
    localStorage.setItem('detailPanelMode', 'inline');
    expect(getInitialLayoutState().detailPanelMode).toBe('inline');
  });
});

describe('useTraceTimelineStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useTraceTimelineStore.setState({
      spanNameColumnWidth: 0.25,
      sidePanelWidth: 0.375,
      detailPanelMode: 'inline',
      timelineBarsVisible: true,
    });
  });

  describe('setSpanNameColumnWidth', () => {
    it('updates spanNameColumnWidth and persists to localStorage', () => {
      useTraceTimelineStore.getState().setSpanNameColumnWidth(0.4);
      expect(useTraceTimelineStore.getState().spanNameColumnWidth).toBeCloseTo(0.4);
      expect(localStorage.getItem('spanNameColumnWidth')).toBe('0.4');
    });

    it('clamps to SPAN_NAME_COLUMN_WIDTH_MIN', () => {
      useTraceTimelineStore.getState().setSpanNameColumnWidth(0.01);
      expect(useTraceTimelineStore.getState().spanNameColumnWidth).toBe(SPAN_NAME_COLUMN_WIDTH_MIN);
    });

    it('clamps to SPAN_NAME_COLUMN_WIDTH_MAX in inline mode', () => {
      useTraceTimelineStore.getState().setSpanNameColumnWidth(0.99);
      expect(useTraceTimelineStore.getState().spanNameColumnWidth).toBe(SPAN_NAME_COLUMN_WIDTH_MAX);
    });

    it('clamps to leave room for side panel and timeline in sidepanel mode', () => {
      useTraceTimelineStore.setState({ detailPanelMode: 'sidepanel', sidePanelWidth: 0.3 });
      useTraceTimelineStore.getState().setSpanNameColumnWidth(0.99);
      expect(useTraceTimelineStore.getState().spanNameColumnWidth).toBeCloseTo(0.65);
    });
  });

  describe('setSidePanelWidth', () => {
    it('updates sidePanelWidth and persists to localStorage', () => {
      useTraceTimelineStore.getState().setSidePanelWidth(0.4);
      expect(useTraceTimelineStore.getState().sidePanelWidth).toBeCloseTo(0.4);
      expect(localStorage.getItem('sidePanelWidth')).toBe('0.4');
    });

    it('clamps to SIDE_PANEL_WIDTH_MIN', () => {
      useTraceTimelineStore.getState().setSidePanelWidth(0.01);
      expect(useTraceTimelineStore.getState().sidePanelWidth).toBe(SIDE_PANEL_WIDTH_MIN);
    });

    it('clamps to SIDE_PANEL_WIDTH_MAX', () => {
      useTraceTimelineStore.getState().setSidePanelWidth(0.99);
      expect(useTraceTimelineStore.getState().sidePanelWidth).toBe(SIDE_PANEL_WIDTH_MAX);
    });

    it('accounts for timeline column when timeline bars are visible', () => {
      useTraceTimelineStore.setState({ timelineBarsVisible: true, spanNameColumnWidth: 0.25 });
      useTraceTimelineStore.getState().setSidePanelWidth(0.99);
      expect(useTraceTimelineStore.getState().sidePanelWidth).toBeCloseTo(0.7);
    });

    it('does not reserve timeline column when timeline bars are hidden', () => {
      useTraceTimelineStore.setState({ timelineBarsVisible: false, spanNameColumnWidth: 0.25 });
      useTraceTimelineStore.getState().setSidePanelWidth(0.99);
      expect(useTraceTimelineStore.getState().sidePanelWidth).toBeCloseTo(0.7);
    });
  });

  describe('setDetailPanelMode', () => {
    it('updates detailPanelMode and persists to localStorage', () => {
      useTraceTimelineStore.getState().setDetailPanelMode('sidepanel');
      expect(useTraceTimelineStore.getState().detailPanelMode).toBe('sidepanel');
      expect(localStorage.getItem('detailPanelMode')).toBe('sidepanel');
    });

    it('clamps spanNameColumnWidth when switching to sidepanel', () => {
      useTraceTimelineStore.setState({ spanNameColumnWidth: 0.8, sidePanelWidth: 0.3 });
      useTraceTimelineStore.getState().setDetailPanelMode('sidepanel');
      expect(useTraceTimelineStore.getState().spanNameColumnWidth).toBeCloseTo(0.65);
    });

    it('does not clamp spanNameColumnWidth when switching to inline', () => {
      useTraceTimelineStore.setState({ spanNameColumnWidth: 0.8, detailPanelMode: 'sidepanel' });
      useTraceTimelineStore.getState().setDetailPanelMode('inline');
      expect(useTraceTimelineStore.getState().spanNameColumnWidth).toBeCloseTo(0.8);
    });
  });

  describe('setTimelineBarsVisible', () => {
    it('updates timelineBarsVisible and persists to localStorage', () => {
      useTraceTimelineStore.getState().setTimelineBarsVisible(false);
      expect(useTraceTimelineStore.getState().timelineBarsVisible).toBe(false);
      expect(localStorage.getItem('timelineVisible')).toBe('false');
    });

    it('persists true as "true"', () => {
      useTraceTimelineStore.getState().setTimelineBarsVisible(false);
      useTraceTimelineStore.getState().setTimelineBarsVisible(true);
      expect(localStorage.getItem('timelineVisible')).toBe('true');
    });
  });
});
