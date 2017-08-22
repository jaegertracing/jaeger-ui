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
import PropTypes from 'prop-types';

import './TimelineRow.css';

const propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
};

const defaultProps = {
  children: null,
  className: '',
};

export default function TimelineRow(props) {
  const { children, className, ...rest } = props;
  // <div className={`row ${className}`} {...rest}>
  return (
    <div className={`flex-row ${className}`} {...rest}>
      {children}
    </div>
  );
}
TimelineRow.propTypes = { ...propTypes };
TimelineRow.defaultProps = { ...defaultProps };

function TimelineRowLeft(props) {
  const { children, className, ...rest } = props;
  return (
    <div className={`col-xs-3 relative ${className}`} {...rest}>
      {children}
    </div>
  );
}
TimelineRowLeft.propTypes = { ...propTypes };
TimelineRowLeft.defaultProps = { ...defaultProps };

TimelineRow.Left = TimelineRowLeft;

function TimelineRowRight(props) {
  const { children, className, ...rest } = props;
  return (
    <div className={`col-xs-9 relative ${className}`} {...rest}>
      {children}
    </div>
  );
}
TimelineRowRight.propTypes = { ...propTypes };
TimelineRowRight.defaultProps = { ...defaultProps };

TimelineRow.Right = TimelineRowRight;
