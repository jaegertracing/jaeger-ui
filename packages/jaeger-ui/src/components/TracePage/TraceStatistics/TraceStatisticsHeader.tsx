// Copyright (c) 2020 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { Checkbox, Select } from 'antd';
import type { CheckboxChangeEvent } from 'antd/es/checkbox';
import { useLayoutEffect, useState } from 'react';
import { IOtelTrace } from '../../../types/otel';
import { ITableSpan } from './types';
import { generateDropdownValue, generateSecondDropdownValue } from './generateDropdownValue';
import { getColumnValues, getColumnValuesSecondDropdown, getServiceName } from './tableValues';
import SearchableSelect from '../../common/SearchableSelect';
import './TraceStatisticsHeader.css';

type Props = {
  trace: IOtelTrace;
  tableValue: ITableSpan[];
  wholeTable: ITableSpan[];
  handler: (
    tableValue: ITableSpan[],
    wholeTable: ITableSpan[],
    valueNameSelector1: string,
    valueNameSelector2: string | null,
    colorByAttribute: string
  ) => void;
  useOtelTerms: boolean;
};

const optionsNameSelector3 = new Map([
  ['Count', 'count'],
  ['Total', 'total'],
  ['Avg', 'avg'],
  ['Min', 'min'],
  ['Max', 'max'],
  ['ST Total', 'selfTotal'],
  ['ST Avg', 'selfAvg'],
  ['ST Min', 'selfMin'],
  ['ST Max', 'selfMax'],
  ['ST in Duration', 'percent'],
]);

export default function TraceStatisticsHeader(props: Props) {
  const { trace, tableValue, wholeTable, handler, useOtelTerms } = props;
  const [valueNameSelector1, setValueNameSelector1State] = useState<string>(getServiceName);
  const [valueNameSelector2, setValueNameSelector2State] = useState<string | null>(null);
  const [valueNameSelector3, setValueNameSelector3State] = useState<string>('Count');
  const [checkboxStatus, setCheckboxStatus] = useState<boolean>(true);

  const getValue = (currentCheckboxStatus = checkboxStatus) => {
    if (!currentCheckboxStatus) {
      return '';
    }
    let toColor = optionsNameSelector3.get(valueNameSelector3);
    if (toColor === undefined) {
      toColor = 'count';
    }
    return toColor;
  };

  useLayoutEffect(() => {
    handler(
      getColumnValues(valueNameSelector1, trace, useOtelTerms),
      getColumnValues(valueNameSelector1, trace, useOtelTerms),
      valueNameSelector1,
      null,
      getValue()
    );
    // eslint-disable-next-line react-x/exhaustive-deps
  }, []);

  const setValueNameSelector1 = (value: string) => {
    setValueNameSelector1State(value);
    setValueNameSelector2State(null);
    handler(
      getColumnValues(value, trace, useOtelTerms),
      getColumnValues(value, trace, useOtelTerms),
      value,
      null,
      getValue()
    );
  };

  const setValueNameSelector2 = (value: string | null | undefined) => {
    if (value == null) return;
    setValueNameSelector2State(value);
    handler(
      getColumnValuesSecondDropdown(tableValue, valueNameSelector1, value, trace, useOtelTerms),
      getColumnValuesSecondDropdown(wholeTable, valueNameSelector1, value, trace, useOtelTerms),
      valueNameSelector1,
      value,
      getValue()
    );
  };

  const setValueNameSelector3 = (value: string) => {
    setValueNameSelector3State(value);

    let toColor = optionsNameSelector3.get(value);
    if (toColor === undefined) {
      toColor = 'count';
    }

    handler(tableValue, wholeTable, valueNameSelector1, valueNameSelector2, checkboxStatus ? toColor : '');
  };

  const checkboxButton = (e: CheckboxChangeEvent) => {
    const isChecked = e.target.checked;
    setCheckboxStatus(isChecked);
    handler(tableValue, wholeTable, valueNameSelector1, valueNameSelector2, getValue(isChecked));
  };

  const clearValue = () => {
    setValueNameSelector2State(null);
    handler(
      getColumnValues(valueNameSelector1, trace, useOtelTerms),
      getColumnValues(valueNameSelector1, trace, useOtelTerms),
      valueNameSelector1,
      null,
      getValue()
    );
  };

  const optionsNameSelector1 = generateDropdownValue(trace, useOtelTerms);
  const optionsNameSelector2 = generateSecondDropdownValue(trace, valueNameSelector1, useOtelTerms);

  return (
    <div className="TraceStatisticsHeader">
      <label className="TraceStatisticsHeader--label">
        <span className="TraceStatisticsHeader--labelText">Group By:</span>
        <SearchableSelect
          className="TraceStatisticsHeader--select"
          value={valueNameSelector1}
          onChange={setValueNameSelector1}
          popupMatchSelectWidth={false}
          fuzzy
        >
          {optionsNameSelector1.map(opt => (
            <Select.Option key={opt} value={opt}>
              {opt}
            </Select.Option>
          ))}
        </SearchableSelect>
      </label>
      <label className="TraceStatisticsHeader--label">
        <span className="TraceStatisticsHeader--labelText">Sub-Group:</span>
        <SearchableSelect
          className="TraceStatisticsHeader--select"
          value={valueNameSelector2}
          onChange={setValueNameSelector2}
          allowClear
          onClear={clearValue}
          placeholder="No item selected"
          popupMatchSelectWidth={false}
          fuzzy
        >
          {optionsNameSelector2.map(opt => (
            <Select.Option key={opt} value={opt}>
              {opt}
            </Select.Option>
          ))}
        </SearchableSelect>
      </label>
      <div className="TraceStatisticsHeader--colorByWrapper">
        <Checkbox
          className="TraceStatisticsHeader--checkbox"
          onChange={checkboxButton}
          checked={checkboxStatus}
        />
        <label className="TraceStatisticsHeader--label">
          <span className="TraceStatisticsHeader--labelText">Color by:</span>
          <SearchableSelect
            className="TraceStatisticsHeader--select"
            value={valueNameSelector3}
            onChange={setValueNameSelector3}
            popupMatchSelectWidth={false}
            fuzzy
          >
            {Array.from(optionsNameSelector3.keys()).map(opt => (
              <Select.Option key={opt} value={opt}>
                {opt}
              </Select.Option>
            ))}
          </SearchableSelect>
        </label>
      </div>
    </div>
  );
}
