// @flow
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

import React from 'react';

import KeyValuesTable from './KeyValuesTable';
import toggleEnhancer from './toggle-enhancer';

import './AccordianKeyValues.css';

type KeyValuesSummaryProps = {
  data: { key: string, value: any }[],
};

function KeyValuesSummary(props: KeyValuesSummaryProps) {
  const { data } = props;
  return (
    <ul className="AccordianKeyValues--summary">
      {data.map((item, i) =>
        // `i` is necessary in the key because item.key can repeat
        // eslint-disable-next-line react/no-array-index-key
        <li className="AccordianKeyValues--summaryItem" key={`${item.key}-${i}`}>
          <span className="AccordianKeyValues--summaryLabel">
            {item.key}
          </span>
          <span className="AccordianKeyValues--summaryDelim">=</span>
          {String(item.value)}
        </li>
      )}
    </ul>
  );
}

type AccordianKeyValuesProps = {
  compact?: boolean,
  data: { key: string, value: any }[],
  highContrast?: boolean,
  isOpen: boolean,
  label: string,
  onToggle: () => void,
};

export default function AccordianKeyValues(props: AccordianKeyValuesProps) {
  const { compact, data, highContrast, isOpen, label, onToggle } = props;
  // console.log('kvs', props.label, props);
  return (
    <div className={`AccordianKeyValues ${compact ? 'is-compact' : ''}`}>
      <div
        className={`AccordianKeyValues--header ${highContrast ? 'is-high-contrast' : ''}`}
        aria-checked={isOpen}
        onClick={onToggle}
        role="switch"
      >
        <strong>
          <i className={`${isOpen ? 'minus' : 'plus'} square outline icon`} />
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

// export default toggleEnhancer(AccordianKeyValues);
