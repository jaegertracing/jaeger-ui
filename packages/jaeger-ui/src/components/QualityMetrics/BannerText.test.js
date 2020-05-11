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

import React from 'react';
import { shallow } from 'enzyme';

import BannerText from './BannerText';

describe('BannerText', () => {
  it('renders null when props.bannerText is falsy', () => {
    expect(shallow(<BannerText />).type()).toBe(null);
  });

  it('renders header when props.bannerText is a string', () => {
    expect(shallow(<BannerText bannerText="foo text" />)).toMatchSnapshot();
  });

  it('renders styled header when props.bannerText is a styled value', () => {
    expect(
      shallow(
        <BannerText
          bannerText={{
            styling: {
              background: 'red',
              color: 'white',
            },
            value: 'foo text',
          }}
        />
      )
    ).toMatchSnapshot();
  });
});
