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

import './SpanTreeOffset.css';

export default function SpanTreeOffset({ level, hasChildren, childrenVisible, onClick }) {
  const className = hasChildren ? 'span-kids-toggle' : '';
  const icon = hasChildren
    ? <i className={`span-tree-toggle-icon icon square ${childrenVisible ? 'outline minus' : 'plus'}`} />
    : null;
  return (
    <span className={className} onClick={onClick}>
      <span className="span-tree-offset" style={{ paddingLeft: `${level * 20}px` }} />
      {icon}
    </span>
  );
}

SpanTreeOffset.propTypes = {
  level: PropTypes.number.isRequired,
  hasChildren: PropTypes.bool,
  childrenVisible: PropTypes.bool,
  onClick: PropTypes.func,
};

SpanTreeOffset.defaultProps = {
  hasChildren: false,
  childrenVisible: false,
  onClick: null,
};
