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
import { Divider } from 'antd';

import './LabeledList.css';

type LabeledListProps = {
  className?: string,
  dividerClassName?: string,
  items: { key: string, label: React.Node, value: React.Node }[],
};

export default function LabeledList(props: LabeledListProps) {
  const { className, dividerClassName, items } = props;
  return (
    <ul className={`LabeledList ${className || ''}`}>
      {items.map(({ key, label, value }, i) => {
        const divider = i < items.length - 1 && (
          <li className="LabeledList--item" key={`${key}--divider`}>
            <Divider className={dividerClassName} type="vertical" />
          </li>
        );
        return [
          <li className="LabeledList--item" key={key}>
            <span className="LabeledList--label">{label}</span>
            <strong>{value}</strong>
          </li>,
          divider,
        ];
      })}
    </ul>
  );
}

LabeledList.defaultProps = {
  className: undefined,
  dividerClassName: undefined,
};
