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

import { TMeasurableNodeProps } from './types';
import { assignMergeCss, getProps } from './utils';

export default class MeasurableHtmlNode<T = {}> extends React.PureComponent<TMeasurableNodeProps<T>> {
  wrapperRef: React.RefObject<HTMLDivElement> = React.createRef();

  measure() {
    const { current } = this.wrapperRef;
    if (!current) {
      return { height: 0, width: 0 };
    }
    return {
      height: current.offsetHeight,
      width: current.offsetWidth,
    };
  }

  render() {
    const { getClassName, hidden, nodeRender, renderUtils, setOnNode, vertex, layoutVertex } = this.props;
    const { height = null, left = null, top = null, width = null } = layoutVertex || {};
    const props = assignMergeCss(getProps(setOnNode, vertex, renderUtils, layoutVertex), {
      className: getClassName('MeasurableHtmlNode'),
      style: {
        height,
        width,
        boxSizing: 'border-box',
        position: 'absolute',
        transform:
          left == null || top == null ? undefined : `translate(${left.toFixed()}px,${top.toFixed()}px)`,
        visibility: hidden ? 'hidden' : undefined,
      },
    });
    return (
      <div ref={this.wrapperRef} {...props}>
        {nodeRender(vertex, renderUtils, layoutVertex)}
      </div>
    );
  }
}
