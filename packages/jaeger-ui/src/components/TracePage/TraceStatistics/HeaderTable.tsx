// Copyright (c) 2020 The Jaeger Authors.
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
import { Icon } from 'antd';
import './HeaderTable.css';

type Props = {
  element: any;
  key: string;
  sortIndex: number;
  index: number;
  sortClick: (index: number) => void;
  sortAsc: boolean;
};

export default function HeaderTable(props: Props) {
  // const thStyle = { width: Math.round(window.innerWidth * 0.2) };
  const iconStyle = { opacity: props.sortIndex === props.index ? 1.0 : 0.2 };
  const iconType = props.sortAsc && props.sortIndex === props.index ? 'up' : 'down';
  return (
    <th className="HeaderTable--th">
      {props.element.title}
      <button type="submit" className="HeaderTable--sortButton" onClick={() => props.sortClick(props.index)}>
        <Icon style={iconStyle} type={iconType} />
      </button>
    </th>
  );
}
