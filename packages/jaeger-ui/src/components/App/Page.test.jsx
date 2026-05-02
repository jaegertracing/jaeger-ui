// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

vi.mock('./TopNav', () => mockDefault(() => <div />));
vi.mock('../../utils/tracking');

const { useEmbeddedStateMock } = vi.hoisted(() => ({
  useEmbeddedStateMock: jest.fn().mockReturnValue(null),
}));

vi.mock('../../stores/embedded-store', () => ({
  useEmbeddedState: (...args) => useEmbeddedStateMock(...args),
}));

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';

import { PageImpl as Page } from './Page';
import { trackPageView } from '../../utils/tracking';

const renderWithPath = (path = '/test?search=value') =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Page />
    </MemoryRouter>
  );

const embeddedV0 = {
  version: 'v0',
  searchHideGraph: false,
  timeline: {
    collapseTitle: false,
    hideMinimap: false,
    hideSummary: false,
  },
};

describe('<Page>', () => {
  beforeEach(() => {
    trackPageView.mockReset();
    useEmbeddedStateMock.mockReturnValue(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders without exploding', () => {
    renderWithPath();
    expect(screen.getByRole('banner')).toBeInTheDocument();
  });

  const mockNavHeight = navHeight => {
    const baseRect = { x: 0, y: 0, top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0 };
    return vi
      .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
      .mockImplementation(function mockGetBoundingClientRect() {
        const height = this.classList.contains('Page--topNav') ? navHeight : 0;
        return { ...baseRect, height, bottom: height, toJSON: () => ({ ...baseRect, height }) };
      });
  };

  it('sets nav height from the rendered header', () => {
    const getBoundingClientRect = mockNavHeight(91.2);

    const { container } = renderWithPath();

    expect(getBoundingClientRect).toHaveBeenCalled();
    expect(container.firstChild).toHaveStyle('--nav-height: 92px');
  });

  it('does not set nav height when the measured header is zero', () => {
    mockNavHeight(0);

    const { container } = renderWithPath();

    expect(container.firstChild.style.getPropertyValue('--nav-height')).toBe('');
  });

  it('falls back to a window resize listener when ResizeObserver is unavailable', () => {
    const originalResizeObserver = global.ResizeObserver;
    delete global.ResizeObserver;
    const addSpy = vi.spyOn(window, 'addEventListener');
    const removeSpy = vi.spyOn(window, 'removeEventListener');
    mockNavHeight(50);

    try {
      const { container, unmount } = renderWithPath();

      const resizeCall = addSpy.mock.calls.find(([type]) => type === 'resize');
      expect(resizeCall).toBeDefined();
      const handler = resizeCall[1];

      mockNavHeight(120);
      handler();
      expect(container.firstChild).toHaveStyle('--nav-height: 120px');

      unmount();
      expect(removeSpy).toHaveBeenCalledWith('resize', handler);
    } finally {
      global.ResizeObserver = originalResizeObserver;
    }
  });

  it('does not measure nav height in embedded mode', () => {
    useEmbeddedStateMock.mockReturnValue(embeddedV0);
    const getBoundingClientRect = mockNavHeight(80);

    const { container } = renderWithPath();

    expect(getBoundingClientRect).not.toHaveBeenCalled();
    expect(container.firstChild.style.getPropertyValue('--nav-height')).toBe('');
  });

  it('tracks an initial page-view using location from useLocation()', () => {
    renderWithPath('/my-path?q=1');
    expect(trackPageView).toHaveBeenCalledWith('/my-path', '?q=1');
  });

  it('tracks a pageView when the location changes', () => {
    const { rerender } = renderWithPath('/first?a=1');
    trackPageView.mockReset();
    // Use a different key to force the MemoryRouter to remount with the new initialEntries.
    rerender(
      <MemoryRouter key="router-2" initialEntries={['/second?b=2']}>
        <Page />
      </MemoryRouter>
    );
    expect(trackPageView).toHaveBeenCalledWith('/second', '?b=2');
  });

  it('tracks a pageView when the search changes but pathname is same', () => {
    const { rerender } = renderWithPath('/same-path?a=1');
    trackPageView.mockReset();
    rerender(
      <MemoryRouter key="router-2" initialEntries={['/same-path?a=2']}>
        <Page />
      </MemoryRouter>
    );
    expect(trackPageView).toHaveBeenCalledWith('/same-path', '?a=2');
  });

  describe('Page embedded', () => {
    beforeEach(() => {
      useEmbeddedStateMock.mockReturnValue(embeddedV0);
      trackPageView.mockReset();
      renderWithPath();
    });

    it('renders without exploding', () => {
      // in embedded mode the Header/banner is hidden; check the content area instead.
      expect(screen.getByRole('main')).toBeInTheDocument();
    });

    it('does not render Header', () => {
      expect(screen.queryByRole('banner')).not.toBeInTheDocument();
    });
  });
});
