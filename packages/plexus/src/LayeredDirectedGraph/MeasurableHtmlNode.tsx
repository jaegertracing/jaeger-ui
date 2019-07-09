// Copyright (c) 2017 Uber Technologies, Inc.
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

export default class MeasurableHtmlNode<T = {}> extends React.PureComponent<TMeasurableNodeProps<T>> {
  static defaultProps = {
    children: undefined,
    hidden: false,
    left: null,
    top: null,
  };

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
    const { classNamePrefix, hidden, render, renderUtils, vertex, layoutVertex, ...rest } = this.props;
    const { left = null, top = null } = layoutVertex || {};
    const p: Record<string, any> = rest;
    p.style = {
      ...p.style,
      position: 'absolute',
      transform: left == null || top == null ? undefined : `translate(${left}px,${top}px)`,
      visibility: hidden ? 'hidden' : undefined,
    };
    p.className = `${classNamePrefix}-Node ${p.className || ''}`;
    return (
      <div ref={this.wrapperRef} {...p}>
        {render(vertex, renderUtils, layoutVertex)}
      </div>
    );
  }
}
