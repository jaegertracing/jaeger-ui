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

import React, { Component } from 'react';
import moment from 'moment';
import PropTypes from 'prop-types';
import dimensions from 'react-dimensions';
import { XYPlot, XAxis, YAxis, MarkSeries, Hint } from 'react-vis';

import { formatDuration } from '../../utils/date';

import './react-vis.css';
import './TraceResultsScatterPlot.css';

class TraceResultsScatterPlot extends Component {
  constructor(props) {
    super(props);
    this.state = {
      overValue: null,
    };
    this.onValueOver = this.onValueOver.bind(this);
    this.onValueOut = this.onValueOut.bind(this);
  }

  onValueOver(data) {
    this.setState({ overValue: data });
  }

  onValueOut() {
    this.setState({ overValue: null });
  }

  render() {
    const { data, containerWidth, onValueClick } = this.props;
    const { overValue } = this.state;
    return (
      <div className="TraceResultsScatterPlot">
        <XYPlot
          margin={{
            left: 50,
          }}
          width={containerWidth}
          height={200}
        >
          <XAxis title="Time" tickTotal={4} tickFormat={t => moment(t).format('hh:mm:ss a')} />
          <YAxis title="Duration" tickTotal={3} tickFormat={t => formatDuration(t, 'milliseconds')} />
          <MarkSeries
            sizeRange={[3, 10]}
            opacity={0.5}
            onValueClick={onValueClick}
            onValueMouseOver={this.onValueOver}
            onValueMouseOut={this.onValueOut}
            data={data}
          />
          {overValue &&
            <Hint value={overValue}>
              <h4 className="scatter-plot-hint">
                {overValue.name || '¯\\_(ツ)_/¯'}
              </h4>
            </Hint>}
        </XYPlot>
      </div>
    );
  }
}

export default dimensions()(TraceResultsScatterPlot);

TraceResultsScatterPlot.propTypes = {
  data: PropTypes.array.isRequired,
  containerWidth: PropTypes.number,
  onValueClick: PropTypes.func,
};

TraceResultsScatterPlot.defaultProps = {
  data: [],
};
