// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { vi } from 'vitest';

const initTracingSpy = vi.fn();
const renderSpy = vi.fn();
const createRootSpy = vi.fn(() => ({ render: renderSpy }));
const trackingContextSpy = vi.fn((fn: () => void) => fn());
const trackingContextRef: { current: unknown } = {
  current: { context: trackingContextSpy },
};

vi.mock('./tracing', () => ({ initTracing: initTracingSpy }));
vi.mock('./components/App', () => mockDefault(() => null));
vi.mock('./site-prefix', () => ({ default: '/' }));
vi.mock('react-dom/client', () => ({ createRoot: createRootSpy }));
vi.mock('./utils/tracking', () => ({
  get context() {
    return trackingContextRef.current;
  },
}));
vi.mock('u-basscss/css/flexbox.css', () => ({}));
vi.mock('u-basscss/css/layout.css', () => ({}));
vi.mock('u-basscss/css/margin.css', () => ({}));
vi.mock('u-basscss/css/padding.css', () => ({}));
vi.mock('u-basscss/css/position.css', () => ({}));
vi.mock('u-basscss/css/typography.css', () => ({}));

describe('src/index.tsx (entry point)', () => {
  let rootDiv: HTMLDivElement | null = null;

  beforeEach(() => {
    vi.resetModules();
    initTracingSpy.mockClear();
    createRootSpy.mockClear();
    renderSpy.mockClear();
    trackingContextSpy.mockClear();
    trackingContextRef.current = { context: trackingContextSpy };
    rootDiv = document.createElement('div');
    rootDiv.id = 'jaeger-ui-root';
    document.body.appendChild(rootDiv);
  });

  afterEach(() => {
    if (rootDiv) document.body.removeChild(rootDiv);
    rootDiv = null;
  });

  it('calls initTracing and mounts the app into #jaeger-ui-root', async () => {
    await import('./index');
    expect(initTracingSpy).toHaveBeenCalledTimes(1);
    expect(createRootSpy).toHaveBeenCalledWith(rootDiv);
    expect(trackingContextSpy).toHaveBeenCalledTimes(1);
  });

  it('renders directly when trackingContext is not an object', async () => {
    trackingContextRef.current = null;
    await import('./index');
    expect(trackingContextSpy).not.toHaveBeenCalled();
    expect(renderSpy).toHaveBeenCalledTimes(1);
  });

  it('throws if the root element is missing', async () => {
    document.body.removeChild(rootDiv!);
    rootDiv = null;
    await expect(import('./index')).rejects.toThrow('Element with id jaeger-ui-root not found');
  });
});
