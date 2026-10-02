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

const mockNavHeight = getNavHeight => {
  const baseRect = { x: 0, y: 0, top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0 };
  return vi
    .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
    .mockImplementation(function mockGetBoundingClientRect() {
      const height = this.classList.contains('Page--topNav') ? getNavHeight() : 0;
      return { ...baseRect, height, bottom: height, toJSON: () => ({ ...baseRect, height }) };
    });
};

describe('<Page>', () => {
  beforeEach(() => {
    trackPageView.mockReset();
    useEmbeddedStateMock.mockReturnValue(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('renders without exploding', () => {
    renderWithPath();
    expect(screen.getByRole('banner')).toBeInTheDocument();
  });

  it('applies non-embedded content class when not embedded', () => {
    const { container } = renderWithPath();
    expect(container.querySelector('.Page--content--no-embedded')).toBeInTheDocument();
  });

  it('keeps the nav offset in sync with the rendered header height', () => {
    let navHeight = 91.2;
    const getBoundingClientRect = mockNavHeight(() => navHeight);
    const observe = vi.fn();
    const disconnect = vi.fn();
    let resizeCallback;
    vi.stubGlobal(
      'ResizeObserver',
      vi.fn(function ResizeObserverMock(callback) {
        resizeCallback = callback;
        return { observe, disconnect, unobserve: vi.fn() };
      })
    );

    const { container, unmount } = renderWithPath();
    const header = screen.getByRole('banner');

    expect(getBoundingClientRect).toHaveBeenCalled();
    expect(observe).toHaveBeenCalledWith(header);
    expect(container.firstChild).toHaveStyle('--nav-height: 92px');

    navHeight = 120;
    resizeCallback();
    expect(container.firstChild).toHaveStyle('--nav-height: 120px');

    unmount();
    expect(disconnect).toHaveBeenCalled();
  });

  it('keeps the default nav height when the header cannot be measured', () => {
    mockNavHeight(() => 0);

    const { container } = renderWithPath();

    expect(container.firstChild.style.getPropertyValue('--nav-height')).toBe('');
  });

  it('falls back to window resize events when ResizeObserver is unavailable', () => {
    let navHeight = 50;
    mockNavHeight(() => navHeight);
    vi.stubGlobal('ResizeObserver', undefined);
    const addEventListener = vi.spyOn(window, 'addEventListener');
    const removeEventListener = vi.spyOn(window, 'removeEventListener');

    const { container, unmount } = renderWithPath();
    const resizeCall = addEventListener.mock.calls.find(([eventName]) => eventName === 'resize');
    expect(resizeCall).toBeDefined();
    const resizeHandler = resizeCall[1];

    navHeight = 120;
    resizeHandler();
    expect(container.firstChild).toHaveStyle('--nav-height: 120px');

    unmount();
    expect(removeEventListener).toHaveBeenCalledWith('resize', resizeHandler);
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

    it('does not apply non-embedded content class', () => {
      const content = screen.getByRole('main');
      expect(content).not.toHaveClass('Page--content--no-embedded');
    });
  });
});
