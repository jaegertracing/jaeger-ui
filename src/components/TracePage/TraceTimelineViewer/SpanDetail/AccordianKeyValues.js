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
import cx from 'classnames';

import KeyValuesTable from './KeyValuesTable';

import './AccordianKeyValues.css';

type AccordianKeyValuesProps = {
  compact?: boolean,
  data: { key: string, value: any }[],
  highContrast?: boolean,
  isOpen: boolean,
  label: string,
  onToggle: () => void,
};

// export for tests
export function KeyValuesSummary(props: { data?: { key: string, value: any }[] }) {
  const { data } = props;
  if (!Array.isArray(data) || !data.length) {
    return null;
  }
  return (
    <ul className="AccordianKeyValues--summary">
      {data.map((item, i) => (
        // `i` is necessary in the key because item.key can repeat
        // eslint-disable-next-line react/no-array-index-key
        <li className="AccordianKeyValues--summaryItem" key={`${item.key}-${i}`}>
          <span className="AccordianKeyValues--summaryLabel">{item.key}</span>
          <span className="AccordianKeyValues--summaryDelim">=</span>
          {String(item.value)}
        </li>
      ))}
    </ul>
  );
}

KeyValuesSummary.defaultProps = {
  data: null,
};

export default function AccordianKeyValues(props: AccordianKeyValuesProps) {
  const { compact, data, highContrast, isOpen, label, onToggle } = props;
  const isEmpty = !Array.isArray(data) || !data.length;
  const iconCls = cx(
    { minus: isOpen, plus: !isOpen, 'AccordianKeyValues--emptyArtifact': isEmpty },
    'square outline icon'
  );
  return (
    <div className={cx('AccordianKeyValues', { 'is-compact': compact })}>
      <div
        className={cx('AccordianKeyValues--header', {
          'is-empty': isEmpty,
          'is-high-contrast': highContrast,
        })}
        aria-checked={isOpen}
        onClick={isEmpty ? null : onToggle}
        role="switch"
      >
        <strong>
          <i className={iconCls} />
          {label}
          :
        </strong>
        {!isOpen && <KeyValuesSummary data={data} />}
      </div>
      {isOpen && <KeyValuesTable data={data} />}
    </div>
  );
}

AccordianKeyValues.defaultProps = {
  compact: false,
  highContrast: false,
};
