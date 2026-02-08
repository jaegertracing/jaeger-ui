// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

jest.mock('./TopNav', () => () => <div />);
jest.mock('../../utils/tracking');

import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';

import { mapStateToProps, PageImpl as Page } from './Page';
import { trackPageView } from '../../utils/tracking';

describe('mapStateToProps()', () => {
  it('maps state to props', () => {
    const state = {};
    expect(mapStateToProps(state)).toEqual({});
  });
});

describe('<Page>', () => {
  let pathname;
  let search;

  beforeEach(() => {
    trackPageView.mockReset();
    pathname = String(Math.random());
    search = String(Math.random());
    render(
      <MemoryRouter initialEntries={[{ pathname, search }]}>
        <Page />
      </MemoryRouter>
    );
  });

  it('renders without exploding', () => {
    expect(screen.getByRole('banner')).toBeInTheDocument();
  });

  it('tracks an initial page-view', () => {
    expect(trackPageView).toHaveBeenCalledWith(pathname, search);
  });

  it('tracks a pageView when the location changes', () => {
    trackPageView.mockReset();
    const newPathname = 'le-path';
    const newSearch = 'searching';
    const { rerender } = render(
      <MemoryRouter initialEntries={[{ pathname: newPathname, search: newSearch }]}>
        <Page />
      </MemoryRouter>
    );
    expect(trackPageView).toHaveBeenCalledWith(newPathname, newSearch);
  });

  it('tracks a pageView when the search changes but pathname is same', () => {
    trackPageView.mockReset();
    const staticPathname = '/same-path';
    const { rerender } = render(
      <MemoryRouter initialEntries={[{ pathname: staticPathname, search: '?a=1' }]}>
        <Page />
      </MemoryRouter>
    );
    rerender(
      <MemoryRouter initialEntries={[{ pathname: staticPathname, search: '?a=2' }]}>
        <Page />
      </MemoryRouter>
    );
    expect(trackPageView).toHaveBeenCalledWith(staticPathname, '?a=2');
  });

  describe('Page embedded', () => {
    beforeEach(() => {
      trackPageView.mockReset();
      pathname = String(Math.random());
      search = 'hideGraph';
      render(
        <MemoryRouter initialEntries={[{ pathname, search }]}>
          <Page embedded />
        </MemoryRouter>
      );
    });

    it('renders without exploding', () => {
      expect(screen.getByRole('banner')).toBeInTheDocument();
    });

    it('does not render Header', () => {
      expect(screen.queryByText('Header')).toBeNull();
    });
  });
});
