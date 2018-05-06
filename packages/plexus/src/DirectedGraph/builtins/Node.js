// @flow

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

import './Node.css';

type Props = {
  classNamePrefix: string,
  hidden?: boolean,
  label: string | React.Node,
  left?: number,
  top?: number,
};

function Node(props: Props, ref: any) {
  const { classNamePrefix, hidden, label, left, top, ...rest } = props;
  const p: Object = rest;
  p.style = {
    ...p.style,
    transform: left == null || top == null ? undefined : `translate(${left}px,${top}px)`,
    visibility: hidden ? 'hidden' : 'visible',
  };
  p.className = `${classNamePrefix}-Node ${p.className || ''}`;
  return (
    <div ref={ref} {...p}>
      {label}
    </div>
  );
}

Node.defaultProps = {
  hidden: false,
  left: null,
  top: null,
};

// ghetto fabulous cast because the 16.3 API is not in flow yet
// https://github.com/facebook/flow/issues/6103
export default (React: any).forwardRef(Node);
