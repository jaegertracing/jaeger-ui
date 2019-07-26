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

import * as React from 'react';
import { shallow } from 'enzyme';
import _set from 'lodash/set';

import { DeepDependencyGraphPageImpl, mapDispatchToProps, mapStateToProps } from '.';
import * as url from './url';
import Graph from './Graph';
import ErrorMessage from '../common/ErrorMessage';
import LoadingIndicator from '../common/LoadingIndicator';
import { fetchedState } from '../../constants';
import { stateKey } from '../../model/ddg/types';
import * as codec from '../../model/ddg/visibility-codec';

describe('DeepDependencyGraphPage', () => {
  describe('DeepDependencyGraphPageImpl', () => {
    const props = {
      history: {
        push: jest.fn(),
      },
      fetchServices: jest.fn(),
      fetchServiceOperations: jest.fn(),
      graphState: {
        model: {
          distanceToPathElems: new Map(),
        },
        state: fetchedState.DONE,
        uxState: new Map(),
      },
      operationsForService: {},
      urlState: {
        start: 'testStart',
        end: 'testEnd',
        service: 'testService',
        operation: 'testOperation',
        visEncoding: 'testVisKey',
      },
      fetchDeepDependencyGraph: () => {},
    };
    const ddgPageImpl = new DeepDependencyGraphPageImpl(props);

    describe('constructor', () => {
      beforeEach(() => {
        props.fetchServices.mockReset();
        props.fetchServiceOperations.mockReset();
      });

      it('fetches services if services are not provided', () => {
        new DeepDependencyGraphPageImpl({ ...props, services: [] }); // eslint-disable-line no-new
        expect(props.fetchServices).not.toHaveBeenCalled();
        new DeepDependencyGraphPageImpl(props); // eslint-disable-line no-new
        expect(props.fetchServices).toHaveBeenCalledTimes(1);
      });

      it('fetches services if service is provided without operations', () => {
        const { service, ...urlState } = props.urlState;
        new DeepDependencyGraphPageImpl({ ...props, urlState }); // eslint-disable-line no-new
        expect(props.fetchServiceOperations).not.toHaveBeenCalled();
        new DeepDependencyGraphPageImpl({ ...props, operationsForService: { [service]: [] } }); // eslint-disable-line no-new
        expect(props.fetchServiceOperations).not.toHaveBeenCalled();
        new DeepDependencyGraphPageImpl(props); // eslint-disable-line no-new
        expect(props.fetchServiceOperations).toHaveBeenLastCalledWith(service);
        expect(props.fetchServiceOperations).toHaveBeenCalledTimes(1);
      });
    });

    describe('shouldComponentUpdate', () => {
      it('returns false if props are unchanged', () => {
        expect(ddgPageImpl.shouldComponentUpdate({ ...props })).toBe(false);
      });

      it('returns false if irrelevant prop is changed', () => {
        expect(ddgPageImpl.shouldComponentUpdate({ ...props, irrelevantProp: 'ignored' })).toBe(false);
      });

      it('returns false if graphState uxState prop is changed', () => {
        const graphState = {
          ...props.graphState,
          uxState: new Map([[3, 4]]),
        };
        expect(ddgPageImpl.shouldComponentUpdate({ ...props, graphState })).toBe(false);
      });

      it('returns true if certain props change', () => {
        [
          'operationsForService',
          'services',
          'urlState.service',
          'urlState.operation',
          'urlState.start',
          'urlState.end',
          'urlState.visEncoding',
          'graphState.state',
        ].forEach(prop => {
          const newProps = {
            ...props,
            urlState: { ...props.urlState },
            graphState: { ...props.graphState },
          };
          expect(ddgPageImpl.shouldComponentUpdate(newProps)).toBe(false);
          _set(newProps, prop, 'new value');
          expect(ddgPageImpl.shouldComponentUpdate(newProps)).toBe(true);
        });
      });
    });

    describe('updateUrlState', () => {
      let getUrlSpy;

      beforeAll(() => {
        getUrlSpy = jest.spyOn(url, 'getUrl');
      });

      beforeEach(() => {
        props.history.push.mockReset();
      });

      it('updates provided value', () => {
        ['service', 'operation', 'start', 'end', 'visEnconding'].forEach((propName, i) => {
          const value = `new ${propName}`;
          const kwarg = { [propName]: value };
          ddgPageImpl.updateUrlState(kwarg);
          expect(getUrlSpy).toHaveBeenLastCalledWith(Object.assign({}, props.urlState, kwarg));
          expect(props.history.push).toHaveBeenCalledTimes(i + 1);
        });
      });

      it('updates multiple values', () => {
        const kwarg = {
          end: 'new end',
          start: 'new start',
        };
        ddgPageImpl.updateUrlState(kwarg);
        expect(getUrlSpy).toHaveBeenLastCalledWith(Object.assign({}, props.urlState, kwarg));
        expect(props.history.push).toHaveBeenCalledTimes(1);
      });

      it('leaves unspecified, previously-undefined values as undefined', () => {
        const { start: _s, end: _e, ...otherUrlState } = props.urlState;
        const otherProps = {
          ...props,
          urlState: otherUrlState,
        };
        const kwarg = {
          end: 'new end',
        };
        const ddgPageWithFewerProps = new DeepDependencyGraphPageImpl(otherProps);
        ddgPageWithFewerProps.updateUrlState(kwarg);
        expect(getUrlSpy).toHaveBeenLastCalledWith(Object.assign({}, otherUrlState, kwarg));
        expect(getUrlSpy).not.toHaveBeenLastCalledWith(expect.objectContaining({ start: expect.anything() }));
        expect(props.history.push).toHaveBeenCalledTimes(1);
      });

      describe('setDistance', () => {
        const mockNewEncoding = '1';
        let encodeDistanceSpy;

        beforeAll(() => {
          encodeDistanceSpy = jest.spyOn(codec, 'encodeDistance').mockImplementation(() => mockNewEncoding);
        });

        it('updates url with result of encodeDistance', () => {
          const distance = -3;
          const direction = -1;
          const visEncoding = props.urlState.visEncoding;
          ddgPageImpl.setDistance(distance, direction);
          expect(encodeDistanceSpy).toHaveBeenLastCalledWith({
            ddgModel: props.graphState.model,
            direction,
            distance,
            prevVisEncoding: visEncoding,
          });
          expect(getUrlSpy).toHaveBeenLastCalledWith(
            Object.assign({}, props.urlState, { visEncoding: mockNewEncoding })
          );
          expect(props.history.push).toHaveBeenCalledTimes(1);
        });

        describe('setOperation', () => {
          it('updates operation and clears visEncoding', () => {
            const operation = 'newOperation';
            ddgPageImpl.setOperation(operation);
            expect(getUrlSpy).toHaveBeenLastCalledWith(
              Object.assign({}, props.urlState, { operation, visEncoding: undefined })
            );
            expect(props.history.push).toHaveBeenCalledTimes(1);
          });
        });

        describe('setService', () => {
          const service = 'newService';

          beforeEach(() => {
            props.fetchServiceOperations.mockReset();
          });

          it('updates service and clears operation and visEncoding', () => {
            ddgPageImpl.setService(service);
            expect(getUrlSpy).toHaveBeenLastCalledWith(
              Object.assign({}, props.urlState, { operation: undefined, service, visEncoding: undefined })
            );
            expect(props.history.push).toHaveBeenCalledTimes(1);
          });

          it('fetches operations for service when not yet provided', () => {
            ddgPageImpl.setService(service);
            expect(props.fetchServiceOperations).toHaveBeenLastCalledWith(service);
            expect(props.fetchServiceOperations).toHaveBeenCalledTimes(1);

            const pageWithOpForService = new DeepDependencyGraphPageImpl({
              ...props,
              operationsForService: { [service]: [props.urlState.operation] },
            });
            const { length: callCount } = props.fetchServiceOperations.mock.calls;
            pageWithOpForService.setService(service);
            expect(props.fetchServiceOperations).toHaveBeenCalledTimes(callCount);
          });
        });
      });
    });

    describe('render', () => {
      it('renders message to query a ddg when no graphState is provided', () => {
        const message = shallow(<DeepDependencyGraphPageImpl {...props} graphState={undefined} />)
          .find('h1')
          .last();
        expect(message.text()).toBe('Enter query above');
      });

      it('renders LoadingIndicator when loading', () => {
        const wrapper = shallow(
          <DeepDependencyGraphPageImpl {...props} graphState={{ state: fetchedState.LOADING }} />
        );
        expect(wrapper.find(LoadingIndicator)).toHaveLength(1);
      });

      it('renders ErrorMessage when erred', () => {
        const error = 'Some API error';
        const errorComponent = shallow(
          <DeepDependencyGraphPageImpl {...props} graphState={{ error, state: fetchedState.ERROR }} />
        ).find(ErrorMessage);
        expect(errorComponent).toHaveLength(1);
        expect(errorComponent.prop('error')).toBe(error);
      });

      it('renders graph when done', () => {
        const graphState = { model: { distanceToPathElems: [] }, state: fetchedState.DONE };
        const wrapper = shallow(<DeepDependencyGraphPageImpl {...props} graphState={graphState} />);
        expect(wrapper.find(Graph)).toHaveLength(1);
      });

      it('renders indication of unknown graphState', () => {
        const state = 'invalid state';
        const unknownIndication = shallow(<DeepDependencyGraphPageImpl {...props} graphState={{ state }} />)
          .find('div')
          .find('div')
          .last()
          .text();
        expect(unknownIndication).toMatch(new RegExp(state));
        expect(unknownIndication).toMatch(/Unknown graphState/);
      });
    });
  });

  describe('mapDispatchToProps()', () => {
    it('creates the actions correctly', () => {
      expect(mapDispatchToProps(() => {})).toEqual({
        fetchDeepDependencyGraph: expect.any(Function),
        fetchServices: expect.any(Function),
        fetchServiceOperations: expect.any(Function),
      });
    });
  });

  describe('mapStateToProps()', () => {
    const start = 'testStart';
    const end = 'testEnd';
    const service = 'testService';
    const operation = 'testOperation';
    const search = '?someParam=someValue';
    const expected = {
      urlState: {
        start,
        end,
        service,
        operation,
      },
    };
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
    const ownProps = { location: { search } };
    let getUrlStateSpy;

    beforeAll(() => {
      getUrlStateSpy = jest.spyOn(url, 'getUrlState');
    });

    beforeEach(() => {
      getUrlStateSpy.mockReset();
      getUrlStateSpy.mockReturnValue(expected.urlState);
    });

    it('uses gets relevant params from location.search', () => {
      const result = mapStateToProps(state, ownProps);
      expect(result).toEqual(expect.objectContaining(expected));
      expect(getUrlStateSpy).toHaveBeenLastCalledWith(search);
    });

    it('includes graphState iff location.search has service, start, end, and optionally operation', () => {
      const graphState = 'testGraphState';
      const graphStateWithoutOp = 'testGraphStateWithoutOp';
      const reduxState = { ...state };
      // TODO: Remove 0s once time buckets are implemented
      _set(
        reduxState,
        ['deepDependencyGraph', stateKey({ service, operation, start: 0, end: 0 })],
        graphState
      );
      _set(reduxState, ['deepDependencyGraph', stateKey({ service, start, end })], graphStateWithoutOp);

      const result = mapStateToProps(reduxState, ownProps);
      expect(result.graphState).toEqual(graphState);

      /* TODO: operation is still required, when requirement is lifted, re-enable
      const { operation: _op, ...rest } = expected.urlState;
      getUrlStateSpy.mockReturnValue(rest);
      const resultWithoutOp = mapStateToProps(reduxState, ownProps);
      expect(resultWithoutOp.graphState).toEqual(graphStateWithoutOp);
      */

      getUrlStateSpy.mockReturnValue({});
      const resultWithoutParams = mapStateToProps(reduxState, ownProps);
      expect(resultWithoutParams.graphState).toBeUndefined();
    });

    it('includes services and operationsForService', () => {
      expect(mapStateToProps(state, ownProps)).toEqual(
        expect.objectContaining({ operationsForService, services })
      );
    });
  });
});
