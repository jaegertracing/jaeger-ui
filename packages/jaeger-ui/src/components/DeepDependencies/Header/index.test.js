// Copyright (c) 2019 Uber Technologies, Inc.
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

import { mapStateToProps, mapDispatchToProps, HeaderImpl } from './index';
import HopsSelector from './HopsSelector';
import NameSelector from './NameSelector';

describe('<Header>', () => {
  const minProps = {
    fetchServices: jest.fn(),
    fetchServiceOperations: jest.fn(),
    operationsForService: {},
    setDistance: jest.fn(),
    setOperation: jest.fn(),
    setService: jest.fn(),
  };
  const service = 'testService';

  beforeEach(() => {
    Object.keys(minProps).forEach(propName => {
      if (minProps[propName].mockReset) {
        minProps[propName].mockReset();
      }
    });
  });

  describe('constructor', () => {
    it('fetches services if services are not provided', () => {
      new HeaderImpl({ ...minProps, services: [] }); // eslint-disable-line no-new
      expect(minProps.fetchServices).not.toHaveBeenCalled();
      new HeaderImpl(minProps); // eslint-disable-line no-new
      expect(minProps.fetchServices).toHaveBeenCalledTimes(1);
    });

    it('fetches services if service is provided without operations', () => {
      new HeaderImpl(minProps); // eslint-disable-line no-new
      expect(minProps.fetchServiceOperations).not.toHaveBeenCalled();
      new HeaderImpl({ ...minProps, operationsForService: { [service]: [] }, service }); // eslint-disable-line no-new
      expect(minProps.fetchServiceOperations).not.toHaveBeenCalled();
      new HeaderImpl({ ...minProps, service }); // eslint-disable-line no-new
      expect(minProps.fetchServiceOperations).toHaveBeenLastCalledWith(service);
      expect(minProps.fetchServiceOperations).toHaveBeenCalledTimes(1);
    });
  });

  describe('render', () => {
    let wrapper;
    const services = [service];
    const operation = 'testOperation';
    const operations = [operation];

    beforeEach(() => {
      wrapper = shallow(<HeaderImpl {...minProps} />);
    });

    it('renders with minimal props', () => {
      expect(wrapper).toMatchSnapshot();
    });

    it('omits the operation selector if a service is not selected', () => {
      const nameSelector = wrapper.find(NameSelector);
      expect(nameSelector.length).toBe(1);
      expect(nameSelector.prop('label')).toMatch(/service/i);
    });

    it('renders the operation selector if a service is selected', () => {
      let nameSelector = wrapper.find(NameSelector);
      wrapper.setProps({ service, services });
      nameSelector = wrapper.find(NameSelector);
      expect(nameSelector.length).toBe(2);
      expect(nameSelector.at(1).prop('label')).toMatch(/operation/i);
      expect(wrapper).toMatchSnapshot();

      wrapper.setProps({ operation, operations });
      expect(wrapper).toMatchSnapshot();
    });

    it('selects service and fetches operations for service when not yet provided', () => {
      const nameSelector = wrapper.find(NameSelector);
      nameSelector.prop('setValue')(service);
      expect(minProps.setService).toHaveBeenLastCalledWith(service);
      expect(minProps.setService).toHaveBeenCalledTimes(1);
      expect(minProps.fetchServiceOperations).toHaveBeenLastCalledWith(service);
      expect(minProps.fetchServiceOperations).toHaveBeenCalledTimes(1);

      wrapper.setProps({ operationsForService: { [service]: operations } });
      nameSelector.prop('setValue')(service);
      expect(minProps.fetchServiceOperations).toHaveBeenCalledTimes(1);
    });

    it('renders the hops selector if distanceToPathElems is provided', () => {
      wrapper.setProps({
        distanceToPathElems: new Map(),
        visEncoding: '3',
      });
      expect(wrapper.find(HopsSelector).length).toBe(1);
      expect(wrapper).toMatchSnapshot();
    });
  });

  describe('mapStateToProps', () => {
    it('maps state to props correctly', () => {
      const services = [service];
      const operationsForService = {
        [service]: ['some operation'],
      };
      const state = {
        otherState: 'otherState',
        services: {
          operationsForService,
          otherState: 'otherState',
          services,
        },
      };

      expect(mapStateToProps(state)).toEqual({ operationsForService, services });
    });
  });

  describe('mapDispatchToProps', () => {
    it('creates the actions correctly', () => {
      expect(mapDispatchToProps(() => {})).toEqual({
        fetchServices: expect.any(Function),
        fetchServiceOperations: expect.any(Function),
      });
    });
  });
});
