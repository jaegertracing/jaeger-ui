// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import { Divider } from 'antd';

import './LabeledList.css';

type LabeledListProps = {
  className?: string;
  dividerClassName?: string;
  items: { key: string; label: React.ReactNode; value: React.ReactNode }[];
};

export default function LabeledList(props: LabeledListProps) {
  const { className, dividerClassName, items } = props;
  return (
    <ul className={`LabeledList ${className || ''}`}>
      {items.map(({ key, label, value }, i) => {
        const divider = i < items.length - 1 && (
          <li className="LabeledList--item" key={`${key}--divider`}>
            <Divider className={dividerClassName} vertical />
          </li>
        );
        return (
          <React.Fragment key={key}>
            <li className="LabeledList--item">
              <span className="LabeledList--label">{label}</span>
              <strong>{value}</strong>
            </li>
            {divider}
          </React.Fragment>
        );
      })}
    </ul>
  );
}
