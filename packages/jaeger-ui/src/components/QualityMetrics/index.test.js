// Copyright (c) 2020 Uber Technologies, Inc.
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

import JaegerAPI from '../../api/jaeger';
import Header from './Header';
import * as getUrl from './url';
import { UnconnectedQualityMetrics, mapDispatchToProps, mapStateToProps } from '.';

describe('QualityMetrics', () => {
  describe('UnconnectedQualityMetrics', () => {
    const props = {
      fetchServices: jest.fn(),
      history: {
        push: jest.fn(),
      },
      lookback: 48,
      service: 'test-service',
      services: ['foo', 'bar', 'baz'],
    };
    const { service: _s, ...propsWithoutService } = props;
    let fetchQualityMetricsSpy;
    let promise;
    let res;
    let rej;

    beforeAll(() => {
      fetchQualityMetricsSpy = jest.spyOn(JaegerAPI, 'fetchQualityMetrics').mockImplementation(() => {
        promise = new Promise((resolve, reject) => {
          res = resolve;
          rej = reject;
        });
        return promise;
      });
    });

    beforeEach(() => {
      props.history.push.mockClear();
      props.fetchServices.mockClear();
      fetchQualityMetricsSpy.mockClear();
    });

    describe('constructor', () => {
      it('fetches services if none are provided', () => {
        const { services: _ses, ...propsWithoutServices } = props;
        // eslint-disable-next-line no-new
        new UnconnectedQualityMetrics(propsWithoutServices);
        expect(props.fetchServices).toHaveBeenCalledTimes(1);
      });

      it('no-ops if services are provided', () => {
        // eslint-disable-next-line no-new
        new UnconnectedQualityMetrics(props);
        expect(props.fetchServices).not.toHaveBeenCalled();
      });
    });

    describe('componentDidMount', () => {
      it('fetches quality metrics', () => {
        shallow(<UnconnectedQualityMetrics {...props} />);
        expect(fetchQualityMetricsSpy).toHaveBeenCalledTimes(1);
        expect(fetchQualityMetricsSpy).toHaveBeenCalledWith(props.service, props.lookback);
      });
    });

    describe('componentDidUpdate', () => {
      const expectedState = {
        qualityMetrics: undefined,
        error: undefined,
        loading: true,
      };
      const initialState = {
        qualityMetrics: {
          scores: [],
          metrics: [],
        },
        error: {},
        loading: false,
      };
      let wrapper;

      beforeEach(() => {
        wrapper = shallow(<UnconnectedQualityMetrics {...props} />);
        wrapper.setState(initialState);
      });

      it('clears state and fetches quality metrics if service changed', () => {
        expect(fetchQualityMetricsSpy).toHaveBeenCalledTimes(1);

        const service = `not-${props.service}`;
        wrapper.setProps({ service });
        expect(fetchQualityMetricsSpy).toHaveBeenCalledTimes(2);
        expect(fetchQualityMetricsSpy).toHaveBeenLastCalledWith(service, props.lookback);
        expect(wrapper.state()).toEqual(expectedState);
      });

      it('clears state and fetches quality metrics if lookback changed', () => {
        expect(fetchQualityMetricsSpy).toHaveBeenCalledTimes(1);

        const lookback = `not-${props.lookback}`;
        wrapper.setProps({ lookback });
        expect(fetchQualityMetricsSpy).toHaveBeenCalledTimes(2);
        expect(fetchQualityMetricsSpy).toHaveBeenLastCalledWith(props.service, lookback);
        expect(wrapper.state()).toEqual(expectedState);
      });

      it('no-ops if neither service or lookback changed', () => {
        expect(fetchQualityMetricsSpy).toHaveBeenCalledTimes(1);

        wrapper.setProps({ services: [] });
        expect(fetchQualityMetricsSpy).toHaveBeenCalledTimes(1);
      });
    });

    describe('fetches quality metrics', () => {
      let wrapper;

      beforeEach(() => {
        wrapper = shallow(<UnconnectedQualityMetrics {...propsWithoutService} />);
      });

      it('no-ops on falsy service', () => {
        expect(wrapper.state('loading')).toBe(undefined);
      });

      it('fetches quality metrics and updates state on success', async () => {
        wrapper.setProps({ service: props.service });
        expect(wrapper.state('loading')).toBe(true);

        const qualityMetrics = {};
        res(qualityMetrics);
        await promise;

        expect(wrapper.state('loading')).toBe(false);
        expect(wrapper.state('qualityMetrics')).toBe(qualityMetrics);
      });

      it('fetches quality metrics and updates state on error', async () => {
        wrapper.setProps({ service: props.service });
        expect(wrapper.state('loading')).toBe(true);

        const error = {};
        rej(error);
        await promise.catch(() => {});

        expect(wrapper.state('loading')).toBe(false);
        expect(wrapper.state('error')).toBe(error);
      });
    });

    describe('url updates', () => {
      const testLookback = props.lookback * 4;
      const testUrl = 'test.url';
      let getUrlSpy;
      let latestUrl;
      let setLookback;
      let wrapper;

      beforeAll(() => {
        getUrlSpy = jest.spyOn(getUrl, 'getUrl').mockImplementation(() => {
          latestUrl = `${testUrl}.${getUrlSpy.mock.calls.length}`;
          return latestUrl;
        });
        wrapper = shallow(<UnconnectedQualityMetrics {...props} />);
        setLookback = wrapper.find(Header).prop('setLookback');
      });

      it('sets service', () => {
        const testService = `new ${props.service}`;
        wrapper.find(Header).prop('setService')(testService);
        expect(getUrlSpy).toHaveBeenLastCalledWith({
          lookback: props.lookback,
          service: testService,
        });
        expect(props.history.push).toHaveBeenLastCalledWith(latestUrl);
      });

      it('sets lookback', () => {
        setLookback(testLookback);
        expect(getUrlSpy).toHaveBeenLastCalledWith({
          lookback: testLookback,
          service: props.service,
        });
        expect(props.history.push).toHaveBeenLastCalledWith(latestUrl);
      });

      it('sets lookback without service', () => {
        wrapper.setProps({ service: undefined });
        setLookback(testLookback);
        expect(getUrlSpy).toHaveBeenLastCalledWith({
          lookback: testLookback,
          service: '',
        });
        expect(props.history.push).toHaveBeenLastCalledWith(latestUrl);
      });

      it('ignores falsy lookback', () => {
        setLookback(null);
        expect(props.history.push).not.toHaveBeenCalled();
      });

      it('ignores string lookback', () => {
        setLookback(props.service);
        expect(props.history.push).not.toHaveBeenCalled();
      });

      it('ignores less than one lookback', () => {
        setLookback(-1);
        expect(props.history.push).not.toHaveBeenCalled();
      });

      it('ignores fractional lookback', () => {
        setLookback(2.5);
        expect(props.history.push).not.toHaveBeenCalled();
      });
    });

    describe('render', () => {
      it('renders without loading, error, or metrics', () => {
        expect(shallow(<UnconnectedQualityMetrics {...propsWithoutService} />)).toMatchSnapshot();
      });

      it('renders when loading', () => {
        expect(shallow(<UnconnectedQualityMetrics {...props} />)).toMatchSnapshot();
      });

      it('renders when errored', async () => {
        const wrapper = shallow(<UnconnectedQualityMetrics {...props} />);
        const message = 'Error message';
        rej({ message });
        await promise.catch(() => {});
        expect(wrapper).toMatchSnapshot();
      });

      it('renders with metrics', async () => {
        const wrapper = shallow(<UnconnectedQualityMetrics {...props} />);
        const metrics = {
          bannerText: 'test banner text',
          traceQualityDocumentationLink: 'trace.quality.documentation/link',
          scores: [
            {
              key: 'score0',
            },
            {
              key: 'score1',
            },
          ],
          metrics: [
            {
              name: 'metric 0',
            },
            {
              name: 'metric 1',
            },
          ],
        };
        res(metrics);
        await promise;
        expect(wrapper).toMatchSnapshot();
      });
    });
  });

  describe('mapDispatchToProps()', () => {
    it('creates the actions correctly', () => {
      expect(mapDispatchToProps(() => {})).toEqual({
        fetchServices: expect.any(Function),
      });
    });
  });

  describe('mapStateToProps()', () => {
    let getUrlStateSpy;
    const urlState = {
      lookback: 108,
      service: 'test-service',
    };

    beforeAll(() => {
      getUrlStateSpy = jest.spyOn(getUrl, 'getUrlState').mockImplementation(search => search && urlState);
    });

    it('gets services from redux state', () => {
      const services = [urlState.service, 'foo', 'bar'];
      expect(mapStateToProps({ services: { services } }, { location: {} })).toEqual({ services });
    });

    it('gets current service and lookback from url', () => {
      const search = 'test search';
      expect(mapStateToProps({ services: {} }, { location: { search } })).toEqual(urlState);
      expect(getUrlStateSpy).toHaveBeenLastCalledWith(search);
    });
  });
});
