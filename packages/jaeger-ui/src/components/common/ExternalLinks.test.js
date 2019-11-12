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
import { shallow, mount } from 'enzyme';
import ExternalLinks from './ExternalLinks';

describe('<ExternalLinks>', () => {
  describe('render  links links', () => {
    it('renders dropdown with multiple links', () => {
      const links = [
        { url: 'http://nowhere/', text: 'some text' },
        { url: 'http://other/', text: 'other text' },
        { url: 'http://link/', text: 'link text' },
      ];

      const wrapper = shallow(<ExternalLinks links={links} />);
      const dropdown = wrapper.find('Dropdown');
      expect(dropdown.length).toBe(1);
    });

    it('renders one link', () => {
      const links = [{ url: 'http://nowhere/', text: 'some text' }];
      const wrapper = shallow(<ExternalLinks links={links} />);
      const dropdown = wrapper.find('Dropdown');
      expect(dropdown.length).toBe(0);
      expect(wrapper.find('LinkValue').length).toBe(1);
    });
  });

  it('is fine when mounted', () => {
    const links = [{ url: 'http://nowhere/', text: 'some text' }];
    const wrapper = mount(<ExternalLinks links={links} />);
    expect(wrapper).toBeDefined();
  });
});
