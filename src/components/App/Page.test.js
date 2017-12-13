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

/* eslint-disable import/first */
jest.mock('./TopNav', () => () => <div />);
jest.mock('../../utils/metrics');

import React from 'react';
import { mount } from 'enzyme';

import { mapStateToProps, PageImpl as Page } from './Page';
import { trackPageView } from '../../utils/metrics';

describe('mapStateToProps()', () => {
  it('maps state to props', () => {
    const state = {
      config: {},
      router: { location: {} },
    };
    const ownProps = { a: {} };
    expect(mapStateToProps(state, ownProps)).toEqual({
      config: state.config,
      location: state.router.location,
      a: ownProps.a,
    });
  });
});

describe('<Page>', () => {
  let props;
  let wrapper;

  beforeEach(() => {
    trackPageView.mockReset();
    props = {
      location: {
        pathname: String(Math.random()),
        search: String(Math.random()),
      },
      config: { menu: [] },
    };
    wrapper = mount(<Page {...props} />);
  });

  it('does not explode', () => {
    expect(wrapper).toBeDefined();
  });

  it('tracks an initial page-view', () => {
    const { pathname, search } = props.location;
    expect(trackPageView.mock.calls).toEqual([[pathname, search]]);
  });

  it('tracks a pageView when the location changes', () => {
    trackPageView.mockReset();
    const location = { pathname: 'le-path', search: 'searching' };
    wrapper.setProps({ location });
    expect(trackPageView.mock.calls).toEqual([[location.pathname, location.search]]);
  });
});
