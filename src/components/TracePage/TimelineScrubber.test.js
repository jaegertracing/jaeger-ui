// Copyright (c) 2017 Uber Technologies, Inc.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.

import React from 'react';
import { shallow } from 'enzyme';
import sinon from 'sinon';

import TimelineScrubber from '../../../src/components/TracePage/TimelineScrubber';
import traceGenerator from '../../../src/demo/trace-generators';

import { getTraceTimestamp, getTraceDuration } from '../../../src/selectors/trace';

describe('<TimelineScrubber>', () => {
  const generatedTrace = traceGenerator.trace({ numberOfSpans: 45 });
  const defaultProps = {
    onMouseDown: sinon.spy(),
    trace: generatedTrace,
    timestamp: getTraceTimestamp(generatedTrace),
  };

  let wrapper;

  beforeEach(() => {
    wrapper = shallow(<TimelineScrubber {...defaultProps} />);
  });

  it('contains the proper svg components', () => {
    expect(
      wrapper.matchesElement(
        <g className="timeline-scrubber">
          <line className="timeline-scrubber__line" />
          <rect className="timeline-scrubber__handle" />
          <circle className="timeline-scrubber__handle--grip" />
          <circle className="timeline-scrubber__handle--grip" />
          <circle className="timeline-scrubber__handle--grip" />
        </g>
      )
    ).toBeTruthy();
  });

  it('calculates the correct x% for a timestamp', () => {
    const timestamp = getTraceDuration(generatedTrace) * 0.5 + getTraceTimestamp(generatedTrace);
    wrapper = shallow(<TimelineScrubber {...defaultProps} timestamp={timestamp} />);
    const line = wrapper.find('line').first();
    const rect = wrapper.find('rect').first();
    expect(line.prop('x1')).toBe('50%');
    expect(line.prop('x2')).toBe('50%');
    expect(rect.prop('x')).toBe('50%');
  });

  it('supports onMouseDown', () => {
    const event = {};
    wrapper.find('g').prop('onMouseDown')(event);
    expect(defaultProps.onMouseDown.calledWith(event)).toBeTruthy();
  });

  it("doesn't fail if onMouseDown is not provided", () => {
    expect(() => wrapper.find('g').prop('onMouseDown')()).not.toThrow();
  });
});
