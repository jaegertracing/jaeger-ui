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

import ErrorMessage from './ErrorMessage';

describe('<ErrorMessage>', () => {
  let wrapper;
  let error;

  beforeEach(() => {
    error = 'some-error';
    wrapper = shallow(<ErrorMessage error={error} />);
  });

  it('is ok when not passed an error', () => {
    wrapper.setProps({ error: null });
    expect(wrapper).toBeDefined();
  });

  it('renders a message when passed a string', () => {
    const msg = wrapper.find('Message');
    expect(msg.length).toBe(1);
    expect(msg.shallow().text()).toMatch(error);
  });

  it('<Details /> renders empty on string error', () => {
    wrapper = shallow(<ErrorMessage.Details error={error} />);
    expect(wrapper).toMatchSnapshot();
  });

  it('<Details /> renders wrapper on wrap', () => {
    error = {
      message: 'some-http-ish-message',
      httpStatusText: 'value-httpStatusText',
      httpUrl: 'value-httpUrl',
      httpQuery: 'value-httpQuery',
      httpBody: 'value-httpBody',
    };
    wrapper = shallow(<ErrorMessage.Details error={error} wrap />);
    expect(wrapper).toMatchSnapshot();
  });

  it('<Details /> renders custom wrapper class', () => {
    error = {
      message: 'some-http-ish-message',
      httpStatusText: 'value-httpStatusText',
      httpUrl: 'value-httpUrl',
      httpQuery: 'value-httpQuery',
      httpBody: 'value-httpBody',
    };
    wrapper = shallow(<ErrorMessage.Details error={error} wrap wrapperClassName="TEST-WRAPPER-CLASS" />);
    expect(wrapper).toMatchSnapshot();
  });

  describe('rendering more complex errors', () => {
    it('renders the error message', () => {
      error = new Error('another-error');
      wrapper.setProps({ error });
      const msg = wrapper.find('Message');
      expect(msg.length).toBe(1);
      expect(msg.shallow().text()).toMatch(error.message);
    });

    it('renders HTTP related data from the error', () => {
      error = {
        message: 'some-http-ish-message',
        httpStatus: 'value-httpStatus',
        httpStatusText: 'value-httpStatusText',
        httpUrl: 'value-httpUrl',
        httpQuery: 'value-httpQuery',
        httpBody: 'value-httpBody',
      };
      wrapper.setProps({ error });
      const details = wrapper.find('Details');
      expect(details.length).toBe(1);
      const detailsWrapper = details.shallow();
      Object.keys(error).forEach(key => {
        if (key === 'message') {
          return;
        }
        const errorAttr = detailsWrapper.find(`ErrorAttr[value="${error[key]}"]`);
        expect(errorAttr.length).toBe(1);
      });
    });

    it('renders truncated body excerpt on large body', () => {
      error = {
        message: 'some-http-ish-message',
        httpStatus: 'value-httpStatus',
        httpStatusText: 'value-httpStatusText',
        httpUrl: 'value-httpUrl',
        httpQuery: 'value-httpQuery',
        httpBody: `value-httpBody-Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed vel
          arcu mattis, pellentesque metus eget, fermentum dolor. Pellentesque habitant morbi
          tristique senectus et netus et malesuada fames ac turpis egestas. Integer placerat turpis
          diam, in eleifend est congue maximus. Sed dictum ipsum a dolor pellentesque, vestibulum
          congue mi pharetra. Pellentesque id augue sit amet libero consectetur rutrum ac rutrum
          nisl. Proin suscipit, libero et gravida tristique, magna dolor pulvinar ex, sit amet
          accumsan tellus metus vel elit. Ut condimentum ultrices felis vel feugiat. Praesent tellus
          nisl, feugiat ut est sed, lobortis lacinia elit. Aenean consequat nunc arcu, in tincidunt
          libero blandit non.
          
          Vestibulum aliquet lobortis tincidunt. Donec in nunc a sapien rutrum ultricies eu ac
          felis. Vestibulum feugiat in mauris id fringilla. Nulla enim nisl, rutrum vel tellus vel,
          tincidunt aliquam enim. Nullam in tortor mi. Vestibulum pellentesque velit eget eros
          varius, ut sollicitudin urna consectetur. Ut gravida, dolor id varius faucibus, magna
          lorem condimentum metus, sit amet hendrerit nisi nisi eu dolor. Nulla vel metus sit amet
          odio rhoncus rutrum eu in sapien. Mauris aliquam sed sem sit amet dignissim.`,
      };

      wrapper.setProps({ error });
      const details = wrapper.find('Details');
      expect(details.length).toBe(1);
      const detailsWrapper = details.shallow();
      expect(detailsWrapper).toMatchSnapshot();
    });

    it('renders on missing httpStatus from the error', () => {
      error = {
        message: 'some-http-ish-message',
        httpStatusText: 'value-httpStatusText',
        httpUrl: 'value-httpUrl',
        httpQuery: 'value-httpQuery',
        httpBody: 'value-httpBody',
      };
      wrapper.setProps({ error });
      const details = wrapper.find('Details');
      expect(details.length).toBe(1);
      const detailsWrapper = details.shallow();
      expect(detailsWrapper).toMatchSnapshot();
    });
  });

  it('is fine when mounted', () => {
    error = { message: 'le-error', httpStatus: 'some-status' };
    wrapper = mount(<ErrorMessage error={error} />);
    expect(wrapper).toBeDefined();
  });
});
