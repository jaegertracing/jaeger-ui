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

import React from 'react';
import IoChevronRight from 'react-icons/lib/io/chevron-right';
import IoIosArrowDown from 'react-icons/lib/io/ios-arrow-down';

import './SpanTreeOffset.css';

type SpanTreeOffsetProps = {
  level: number,
  hasChildren: boolean,
  childrenVisible: boolean,
  onClick: ?() => void,
};

export default function SpanTreeOffset(props: SpanTreeOffsetProps) {
  const { level, hasChildren, childrenVisible, onClick } = props;
  const wrapperProps = hasChildren ? { onClick, role: 'switch', 'aria-checked': childrenVisible } : null;
  const icon = hasChildren && (childrenVisible ? <IoIosArrowDown /> : <IoChevronRight />);
  return (
    <span className={`SpanTreeOffset ${hasChildren ? 'is-parent' : ''}`} {...wrapperProps}>
      <span style={{ paddingLeft: `${level * 20}px` }} />
      {icon && <span className="SpanTreeOffset--iconWrapper">{icon}</span>}
    </span>
  );
}

SpanTreeOffset.defaultProps = {
  hasChildren: false,
  childrenVisible: false,
  onClick: null,
};
