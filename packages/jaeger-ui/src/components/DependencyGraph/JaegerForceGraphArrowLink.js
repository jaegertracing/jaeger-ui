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

import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';

import { ForceGraphLink} from 'react-vis-force';

 function linkId(link) {
  return `${link.source.id || link.source}=>${link.target.id || link.target}`;
}


export default class JaegerForceGraphArrowLink extends PureComponent { 
  static get propTypes() {
    return {
      link: PropTypes.shape({
  source: PropTypes.string.isRequired,
  target: PropTypes.string.isRequired,
  value: PropTypes.number,
}).isRequired,
      targetRadius: PropTypes.number,
      edgeOffset: PropTypes.number,
      className: PropTypes.string,
      opacity: PropTypes.number,
      stroke: PropTypes.string,
      strokeWidth: PropTypes.number
    };
  }

  static get defaultProps() {
    return {
      className: '',
      opacity: 0.6,
      stroke: '#999',
      targetRadius: 2,
      edgeOffset: 2,
      strokeWidth: 1,
    };
  }

  render() {
    const { link, targetRadius, edgeOffset: _, ...spreadable } = this.props;
    const id = `arrow-${linkId(link)}`;
    return (
      <g>
        <defs>
          <marker
            id={id}
            markerWidth={6}
            markerHeight={4}
            refX={ 5 +  link.target_node_size }
            refY={ 2 }
            orient="auto"
            markerUnits="strokeWidth"
          >
           {targetRadius > 0 && <path d="M0,0 L0,4 L6,2 z" fill={spreadable.stroke || spreadable.color} />}
          </marker>
        </defs>

        <ForceGraphLink {...spreadable} link={link} markerEnd={`url(#${id})`} />
      </g>
    );
  }
}

