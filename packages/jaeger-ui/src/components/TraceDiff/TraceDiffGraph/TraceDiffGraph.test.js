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
import _mapValues from 'lodash/mapValues';

import TraceDiffGraph, { setOnNodesContainer, setOnEdgesContainer, setOnNode } from './TraceDiffGraph';
import ErrorMessage from '../../common/ErrorMessage';
import LoadingIndicator from '../../common/LoadingIndicator';
import { fetchedState } from '../../../constants';

describe('TraceDiffGraph', () => {
  const props = {
    a: {
      data: {
        spans: [],
        traceID: 'trace-id-a',
      },
      error: null,
      id: 'trace-id-a',
      state: fetchedState.DONE,
    },
    b: {
      data: {
        spans: [],
        traceID: 'trace-id-b',
      },
      error: null,
      id: 'trace-id-b',
      state: fetchedState.DONE,
    },
  };
  let wrapper;

  beforeEach(() => {
    wrapper = shallow(<TraceDiffGraph {...props} />);
  });

  it('renders warning when a or b are not provided', () => {
    expect(wrapper.find('h1').length).toBe(0);

    wrapper.setProps({ a: undefined });
    expect(wrapper.find('h1').length).toBe(1);
    expect(wrapper.find('h1').text()).toBe('At least two Traces are needed');

    wrapper.setProps({ b: undefined });
    expect(wrapper.find('h1').length).toBe(1);
    expect(wrapper.find('h1').text()).toBe('At least two Traces are needed');

    wrapper.setProps({ a: props.a });
    expect(wrapper.find('h1').length).toBe(1);
    expect(wrapper.find('h1').text()).toBe('At least two Traces are needed');
  });

  it('renders warning when a or b have errored', () => {
    expect(wrapper.find(ErrorMessage).length).toBe(0);

    const errorA = 'some error text for trace a';
    wrapper.setProps({
      a: {
        ...props.a,
        error: errorA,
      },
    });

    expect(wrapper.find(ErrorMessage).length).toBe(1);
    expect(wrapper.find(ErrorMessage).props()).toEqual(
      expect.objectContaining({
        error: errorA,
      })
    );
    const errorB = 'some error text for trace a';
    wrapper.setProps({
      b: {
        ...props.b,
        error: errorB,
      },
    });

    expect(wrapper.find(ErrorMessage).length).toBe(2);
    expect(
      wrapper
        .find(ErrorMessage)
        .at(1)
        .props()
    ).toEqual(
      expect.objectContaining({
        error: errorB,
      })
    );
    wrapper.setProps({
      a: props.a,
    });
    expect(wrapper.find(ErrorMessage).length).toBe(1);
    expect(wrapper.find(ErrorMessage).props()).toEqual(
      expect.objectContaining({
        error: errorB,
      })
    );
  });

  it('renders a loading indicator when a or b are loading', () => {
    expect(wrapper.find(LoadingIndicator).length).toBe(0);

    wrapper.setProps({
      a: {
        state: fetchedState.LOADING,
      },
    });
    expect(wrapper.find(LoadingIndicator).length).toBe(1);

    wrapper.setProps({
      b: {
        state: fetchedState.LOADING,
      },
    });
    expect(wrapper.find(LoadingIndicator).length).toBe(1);

    wrapper.setProps({ a: props.a });
    expect(wrapper.find(LoadingIndicator).length).toBe(1);
  });

  it('renders an empty div when a or b lack data', () => {
    expect(wrapper.children().length).not.toBe(0);

    const { data: unusedAData, ...aWithoutData } = props.a;
    wrapper.setProps({ a: aWithoutData });
    expect(wrapper.children().length).toBe(0);

    const { data: unusedBData, ...bWithoutData } = props.b;
    wrapper.setProps({ b: bWithoutData });
    expect(wrapper.children().length).toBe(0);

    wrapper.setProps({ a: props.a });
    expect(wrapper.children().length).toBe(0);
  });

  it('cleans up layoutManager before unmounting', () => {
    const layoutManager = jest.spyOn(wrapper.instance().layoutManager, 'stopAndRelease');
    wrapper.unmount();
    expect(layoutManager).toHaveBeenCalledTimes(1);
  });

  describe('setOnEdgesContainer', () => {
    it('returns null if zoomTransform kwarg is falsy', () => {
      expect(setOnEdgesContainer({ zoomTransform: null })).toBe(null);
      expect(setOnEdgesContainer({ zoomTransform: undefined })).toBe(null);
    });

    it('calculates style object with opacity off of zoomTransform.k', () => {
      expect(setOnEdgesContainer({ zoomTransform: { k: 0.0 } }).style.opacity).toBe(0.1);
      expect(setOnEdgesContainer({ zoomTransform: { k: 0.3 } }).style.opacity).toBe(0.37);
      expect(setOnEdgesContainer({ zoomTransform: { k: 0.5 } }).style.opacity).toBe(0.55);
      expect(setOnEdgesContainer({ zoomTransform: { k: 0.7 } }).style.opacity).toBe(0.73);
      expect(setOnEdgesContainer({ zoomTransform: { k: 1.0 } }).style.opacity).toBe(1);
    });
  });

  describe('setOnNodesContainer', () => {
    function stringPxCountToNumber(stringPx) {
      return Number.parseInt(stringPx.split('px')[0], 10);
    }

    function getComputedSizes(k) {
      const { style } = setOnNodesContainer({ zoomTransform: k != undefined ? { k } : undefined }); // eslint-disable-line eqeqeq
      const [, , boxShadowBlurRadius, boxShadowSpreadRadius] = style.boxShadow.split(' ');
      return {
        outlineWidth: stringPxCountToNumber(style.outlineWidth),
        boxShadowBlurRadius: stringPxCountToNumber(boxShadowBlurRadius),
        boxShadowSpreadRadius: stringPxCountToNumber(boxShadowSpreadRadius),
      };
    }
    const sizeIdentity = {
      outlineWidth: 2,
      boxShadowBlurRadius: 4,
      boxShadowSpreadRadius: 8,
    };

    it('defaults style object with box-shadow size and outlineWidth off of 2 if zoomTransform.k is not provided', () => {
      expect(getComputedSizes(null)).toEqual(sizeIdentity);
      expect(getComputedSizes(undefined)).toEqual(sizeIdentity);
    });

    it('calculates style object with box-shadow size and outlineWidth at default size if zoomTransform.k is 1', () => {
      expect(getComputedSizes(1)).toEqual(sizeIdentity);
    });

    it('calculates style object with box-shadow size and outlineWidth 150% as large if zoomTransform.k is .5', () => {
      expect(getComputedSizes(0.5)).toEqual(_mapValues(sizeIdentity, x => x * 1.5));
    });

    it('calculates style object with box-shadow size and outlineWidth twice as large if zoomTransform.k is .33', () => {
      expect(getComputedSizes(0.33)).toEqual(_mapValues(sizeIdentity, x => x * 2));
    });

    it('calculates style object with box-shadow size and outlineWidth 250% as large if zoomTransform.k is .25', () => {
      expect(getComputedSizes(0.25)).toEqual(_mapValues(sizeIdentity, x => x * 2.5));
    });
  });

  describe('setOnNode', () => {
    it("inherits container's boxShadow and outlineWidth", () => {
      expect(setOnNode()).toEqual({
        style: {
          boxShadow: 'inherit',
          outlineWidth: 'inherit',
        },
      });
    });
  });
});
