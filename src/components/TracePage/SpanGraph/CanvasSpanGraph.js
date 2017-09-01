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

import PropTypes from 'prop-types';
import React from 'react';

import renderIntoCanvas from './render-into-canvas';
import colorGenerator from '../../../utils/color-generator';

import './index.css';

const MIN_SPAN_WIDTH = 0.002;

const CV_WIDTH = 10000;

const getColor = str => colorGenerator.getColorByKey(str);

export default class CanvasSpanGraph extends React.PureComponent {
  constructor(props) {
    super(props);
    this._canvasElm = undefined;
    this._setCanvasRef = this._setCanvasRef.bind(this);
  }

  componentDidMount() {
    this._draw();
  }

  componentDidUpdate() {
    this._draw();
  }

  _setCanvasRef(elm) {
    this._canvasElm = elm;
  }

  _draw() {
    if (!this._canvasElm) {
      return;
    }
    const { valueWidth: totalValueWidth, items } = this.props;
    renderIntoCanvas(this._canvasElm, items, totalValueWidth, getColor);
  }

  render() {
    return (
      <canvas
        className="CanvasSpanGraph"
        ref={this._setCanvasRef}
        width={CV_WIDTH}
        height={this.props.items.length}
      />
    );
  }
}

CanvasSpanGraph.propTypes = {
  items: PropTypes.arrayOf(
    PropTypes.shape({
      valueWidth: PropTypes.number.isRequired,
      valueOffset: PropTypes.number.isRequired,
      serviceName: PropTypes.string.isRequired,
    })
  ).isRequired,
  valueWidth: PropTypes.number.isRequired,
};
