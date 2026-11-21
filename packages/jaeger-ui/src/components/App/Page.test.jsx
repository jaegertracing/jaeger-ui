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

const assistantMock = vi.hoisted(() => ({ configured: false }));
const assistantDockMock = vi.hoisted(() => ({ shouldThrow: false }));

vi.mock('../../hooks/useJaegerAssistant', () => ({
  useJaegerAssistantConfigured: () => assistantMock.configured,
  useJaegerAssistantEnabled: () => assistantMock.configured,
}));

vi.mock('./JaegerAssistantPanel', () => ({
  JaegerAssistantDock: () => {
    if (assistantDockMock.shouldThrow) {
      throw new Error('dock render failure');
    }
    return <aside data-testid="assistant-dock" />;
  },
}));

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';

import { PageImpl as Page, loadJaegerAssistantDock, JaegerAssistantErrorBoundary } from './Page';
import { JaegerAssistantProvider } from './JaegerAssistantContext';
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
    assistantMock.configured = false;
    assistantDockMock.shouldThrow = false;
  });

  it('renders without exploding', () => {
    renderWithPath();
    expect(screen.getByRole('banner')).toBeInTheDocument();
  });

  it('applies non-embedded content class when not embedded', () => {
    const { container } = renderWithPath();
    expect(container.querySelector('.Page--content--no-embedded')).toBeInTheDocument();
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

  describe('assistant dock', () => {
    const renderWithAssistant = () =>
      render(
        <MemoryRouter initialEntries={['/test']}>
          <JaegerAssistantProvider>
            <Page>
              <span data-testid="page-child" />
            </Page>
          </JaegerAssistantProvider>
        </MemoryRouter>
      );

    it('does not load the dock when the assistant is not configured', () => {
      renderWithAssistant();
      expect(screen.getByTestId('page-child')).toBeInTheDocument();
      expect(screen.queryByTestId('assistant-dock')).not.toBeInTheDocument();
    });

    it('lazy-loads the dock when the assistant is configured', async () => {
      assistantMock.configured = true;
      renderWithAssistant();
      expect(await screen.findByTestId('assistant-dock')).toBeInTheDocument();
      expect(screen.getByTestId('page-child')).toBeInTheDocument();
    });

    it('degrades to an empty dock when the chunk fails to load', async () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const err = new Error('chunk load failed');
      const { default: Fallback } = await loadJaegerAssistantDock(() => Promise.reject(err));
      expect(spy).toHaveBeenCalledWith('[jaeger-assistant] failed to load the assistant panel', err);
      expect(Fallback()).toBeNull();
      spy.mockRestore();
    });

    it('catches render errors in the dock and preserves page children', async () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
      assistantMock.configured = true;
      assistantDockMock.shouldThrow = true;

      renderWithAssistant();

      expect(await screen.findByTestId('page-child')).toBeInTheDocument();
      expect(screen.queryByTestId('assistant-dock')).not.toBeInTheDocument();
      expect(spy).toHaveBeenCalledWith(
        '[jaeger-assistant] failed to render the assistant panel',
        expect.any(Error)
      );
      spy.mockRestore();
    });
  });

  describe('JaegerAssistantErrorBoundary', () => {
    it('renders children when no error occurs', () => {
      render(
        <JaegerAssistantErrorBoundary>
          <span data-testid="boundary-child" />
        </JaegerAssistantErrorBoundary>
      );
      expect(screen.getByTestId('boundary-child')).toBeInTheDocument();
    });

    it('renders fallback when specified on error', () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const ThrowingComp = () => {
        throw new Error('boom');
      };
      render(
        <JaegerAssistantErrorBoundary fallback={<span data-testid="fallback" />}>
          <ThrowingComp />
        </JaegerAssistantErrorBoundary>
      );
      expect(screen.getByTestId('fallback')).toBeInTheDocument();
      expect(spy).toHaveBeenCalledWith(
        '[jaeger-assistant] failed to render the assistant panel',
        expect.any(Error)
      );
      spy.mockRestore();
    });
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
