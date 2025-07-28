// Copyright (c) 2017 Uber Technologies, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

jest.mock('./TopNav', () => () => <div />);
jest.mock('../../utils/tracking');

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import { mapStateToProps, PageImpl as Page } from './Page';
import { trackPageView } from '../../utils/tracking';

describe('mapStateToProps()', () => {
  it('maps state to props', () => {
    const pathname = 'a-pathname';
    const search = 'a-search';
    const state = {
      router: { location: { pathname, search } },
    };
    expect(mapStateToProps(state)).toEqual({ pathname, search });
  });
});

describe('<Page>', () => {
  let props;

  beforeEach(() => {
    trackPageView.mockReset();
    props = {
      pathname: String(Math.random()),
      search: String(Math.random()),
    };
    render(<Page {...props} />);
  });

  it('renders without exploding', () => {
    expect(screen.getByRole('banner')).toBeInTheDocument();
  });

  it('tracks an initial page-view', () => {
    const { pathname, search } = props;
    expect(trackPageView).toHaveBeenCalledWith(pathname, search);
  });

  it('tracks a pageView when the location changes', () => {
    trackPageView.mockReset();
    const newProps = { pathname: 'le-path', search: 'searching' };
    const { rerender } = render(<Page {...props} />);
    rerender(<Page {...newProps} />);
    expect(trackPageView).toHaveBeenCalledWith(newProps.pathname, newProps.search);
  });

  it('tracks a pageView when the search changes but pathname is same', () => {
    trackPageView.mockReset();
    const staticPathname = '/same-path';
    const { rerender } = render(<Page pathname={staticPathname} search="?a=1" />);
    rerender(<Page pathname={staticPathname} search="?a=2" />);
    expect(trackPageView).toHaveBeenCalledWith(staticPathname, '?a=2');
  });

  describe('Page embedded', () => {
    beforeEach(() => {
      trackPageView.mockReset();
      props = {
        pathname: String(Math.random()),
        search: 'hideGraph',
      };
      render(<Page embedded {...props} />);
    });

    it('renders without exploding', () => {
      expect(screen.getByRole('banner')).toBeInTheDocument();
    });

    it('does not render Header', () => {
      expect(screen.queryByText('Header')).toBeNull();
    });
  });
});
