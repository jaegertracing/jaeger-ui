// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

vi.mock('./TopNav', () => mockDefault(() => <div />));
vi.mock('../../utils/tracking');

const { getEmbeddedFromUrlMock } = vi.hoisted(() => ({
  getEmbeddedFromUrlMock: jest.fn().mockReturnValue(null),
}));

vi.mock('../../stores/embedded-store', () => ({
  getEmbeddedFromUrl: (...args) => getEmbeddedFromUrlMock(...args),
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
    getEmbeddedFromUrlMock.mockReturnValue(null);
  });

  it('renders without exploding', () => {
    renderWithPath();
    expect(screen.getByRole('banner')).toBeInTheDocument();
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
      getEmbeddedFromUrlMock.mockReturnValue(embeddedV0);
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
