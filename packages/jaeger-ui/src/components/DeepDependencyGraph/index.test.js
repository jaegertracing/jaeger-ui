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
import cloneDeep from 'lodash/cloneDeep';
import _set from 'lodash/set';

import { DeepDependencyGraphPageImpl, mapDispatchToProps, mapStateToProps } from '.';
import * as url from './url';
import Graph from './Graph';
import ErrorMessage from '../common/ErrorMessage';
import LoadingIndicator from '../common/LoadingIndicator';
import { fetchedState } from '../../constants';
import { stateKey } from '../../model/ddg/types';

describe('DeepDependencyGraphPage', () => {
  describe('DeepDependencyGraphPageImpl', () => {
    const props = {
      history: {
        push: jest.fn(),
      },
      graphState: {
        uxState: new Map(),
        state: fetchedState.DONE,
      },
      urlState: {
        start: 'testStart',
        end: 'testEnd',
        service: 'testService',
        operation: 'testOperation',
        visEncoding: 'testVisKey',
      },
    };
    const ddgPageImpl = new DeepDependencyGraphPageImpl(props);

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
          'urlState.service',
          'urlState.operation',
          'urlState.start',
          'urlState.end',
          'urlState.visEncoding',
          'graphState.state',
        ].forEach(prop => {
          const newProps = cloneDeep(props);
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
        expect(props.history.push).toHaveBeenCalledTimes(1);
      });

      describe('updateVisEncoding', () => {
        it('updates visEncoding', () => {
          const visEncoding = 'new visEncoding';
          ddgPageImpl.updateVisEncoding(visEncoding);
          expect(getUrlSpy).toHaveBeenLastCalledWith(Object.assign({}, props.urlState, { visEncoding }));
          expect(props.history.push).toHaveBeenCalledTimes(1);
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
        const wrapper = shallow(
          <DeepDependencyGraphPageImpl {...props} graphState={{ state: fetchedState.DONE }} />
        );
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
    let getUrlStateSpy;

    beforeAll(() => {
      getUrlStateSpy = jest.spyOn(url, 'getUrlState');
    });

    beforeEach(() => {
      getUrlStateSpy.mockReset();
    });

    it('uses gets relevant params from location.search', () => {
      getUrlStateSpy.mockReturnValue(expected.urlState);
      const result = mapStateToProps({}, { location: { search } });
      expect(result).toEqual(expected);
      expect(getUrlStateSpy).toHaveBeenLastCalledWith(search);
    });

    it('includes graphState iff location.search has service, start, end, and optionally operation', () => {
      const graphState = 'testGraphState';
      const graphStateWithoutOp = 'testGraphStateWithoutOp';
      const reduxState = {};
      _set(reduxState, ['deepDependencyGraph', stateKey({ service, operation, start, end })], graphState);
      _set(
        reduxState,
        ['deepDependencyGraph', stateKey({ service, undefined, start, end })],
        graphStateWithoutOp
      );

      getUrlStateSpy.mockReturnValue(expected.urlState);
      const result = mapStateToProps(reduxState, { location: { search } });
      expect(result.graphState).toEqual(graphState);

      const { operation: _op, ...rest } = expected.urlState;
      getUrlStateSpy.mockReturnValue(rest);
      const resultWithoutOp = mapStateToProps(reduxState, { location: { search } });
      expect(resultWithoutOp.graphState).toEqual(graphStateWithoutOp);

      getUrlStateSpy.mockReturnValue({});
      const resultWithoutParams = mapStateToProps(reduxState, { location: { search } });
      expect(resultWithoutParams.graphState).toBeUndefined();
    });
  });
});
