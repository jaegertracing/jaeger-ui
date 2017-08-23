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
import PropTypes from 'prop-types';

import wrapComponentName from './wrap-component-name';

export default function measureEnhancer(BaseComponent) {
  return class extends Component {
    static displayName = wrapComponentName('measure', BaseComponent);
    static propTypes = { onMeasureChange: PropTypes.func };
    static defaultProps = { onMeasureChange: null };

    constructor(props) {
      super(props);
      this.sourceElm = null;
      this.lastHeight = undefined;
      this.lastWidth = undefined;
      this.setSourceElm = this.setSourceElm.bind(this);
    }

    componentDidUpdate() {
      this.measure();
    }

    setSourceElm(elm) {
      this.sourceElm = elm;
      this.measure();
    }

    measure() {
      const { onMeasureChange } = this.props;
      if (!onMeasureChange) {
        return;
      }
      const { offsetHeight, offsetWidth } = this.sourceElm ? this.sourceElm : {};
      if (offsetHeight !== this.lastHeight || offsetWidth !== this.lastWidth) {
        this.lastHeight = offsetHeight;
        this.lastWidth = offsetWidth;
        this.props.onMeasureChange(offsetWidth, offsetHeight);
      }
    }

    render() {
      const { onMeasureChange: _, ...childProps } = this.props;
      return <BaseComponent {...childProps} setMeasureRef={this.setSourceElm} />;
    }
  };
}
