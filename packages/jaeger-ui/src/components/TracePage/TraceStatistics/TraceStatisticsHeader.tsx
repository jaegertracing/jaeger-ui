// Copyright (c) 2020 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { Checkbox, Select } from 'antd';
import type { CheckboxChangeEvent } from 'antd/es/checkbox';
import React, { useState, useEffect, useCallback } from 'react';
import { IOtelTrace } from '../../../types/otel';
import { ITableSpan } from './types';
import { generateDropdownValue, generateSecondDropdownValue } from './generateDropdownValue';
import { getColumnValues, getColumnValuesSecondDropdown, getServiceName } from './tableValues';
import SearchableSelect from '../../common/SearchableSelect';
import generateColor from './generateColor';
import './TraceStatisticsHeader.css';

type Props = {
  trace: IOtelTrace;
  tableValue: ITableSpan[];
  wholeTable: ITableSpan[];
  handler: (
    tableValue: ITableSpan[],
    wholeTable: ITableSpan[],
    valueNameSelector1: string,
    valueNameSelector2: string | null
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

  const [valueNameSelector1, setValueNameSelector1State] = useState<string>(getServiceName());
  const [valueNameSelector2, setValueNameSelector2State] = useState<string | null>(null);
  const [valueNameSelector3, setValueNameSelector3State] = useState<string>('Count');
  const [checkboxStatus, setCheckboxStatus] = useState<boolean>(false);

  /**
   * Returns the value of optionsNameSelector3.
   */
  const getValue = useCallback(() => {
    let toColor = optionsNameSelector3.get(valueNameSelector3);
    if (toColor === undefined) {
      toColor = '';
    }
    return toColor;
  }, [valueNameSelector3]);

  useEffect(() => {
    const serviceName = getServiceName();
    const columnValues = getColumnValues(serviceName, trace, useOtelTerms);
    handler(columnValues, columnValues, serviceName, null);
  }, [handler, trace, useOtelTerms]);

  /**
   * Is called after a value from the first dropdown is selected.
   */
  const setValueNameSelector1 = useCallback(
    (value: string) => {
      setValueNameSelector1State(value);
      setValueNameSelector2State(null);
      const columnValues = getColumnValues(value, trace, useOtelTerms);
      const colored = generateColor(columnValues, getValue(), checkboxStatus);
      handler(colored, colored, value, null);
    },
    [trace, useOtelTerms, getValue, checkboxStatus, handler]
  );

  /**
   * Is called after a value from the second dropdown is selected.
   */
  const setValueNameSelector2 = useCallback(
    (value: string) => {
      setValueNameSelector2State(value);
      const newTableValue = generateColor(
        getColumnValuesSecondDropdown(tableValue, valueNameSelector1, value, trace, useOtelTerms),
        getValue(),
        checkboxStatus
      );
      const newWholeTable = generateColor(
        getColumnValuesSecondDropdown(wholeTable, valueNameSelector1, value, trace, useOtelTerms),
        getValue(),
        checkboxStatus
      );
      handler(newTableValue, newWholeTable, valueNameSelector1, value);
    },
    [tableValue, wholeTable, valueNameSelector1, trace, useOtelTerms, getValue, checkboxStatus, handler]
  );

  /**
   * Is called after a value from the third dropdown is selected.
   */
  const setValueNameSelector3 = useCallback(
    (value: string) => {
      setValueNameSelector3State(value);

      let toColor = optionsNameSelector3.get(value);
      if (toColor === undefined) {
        toColor = '';
      }
      const newTableValue = generateColor(tableValue, toColor, checkboxStatus);
      const newWholeTable = generateColor(wholeTable, toColor, checkboxStatus);
      handler(newTableValue, newWholeTable, valueNameSelector1, valueNameSelector2);
    },
    [tableValue, wholeTable, checkboxStatus, handler, valueNameSelector1, valueNameSelector2]
  );

  /**
   * Is called after the checkbox changes its status.
   */
  const checkboxButton = useCallback(
    (e: CheckboxChangeEvent) => {
      setCheckboxStatus(e.target.checked);

      const newTableValue = generateColor(tableValue, getValue(), e.target.checked);
      const newWholeTable = generateColor(wholeTable, getValue(), e.target.checked);
      handler(newTableValue, newWholeTable, valueNameSelector1, valueNameSelector2);
    },
    [tableValue, wholeTable, getValue, handler, valueNameSelector1, valueNameSelector2]
  );

  /**
   * Sets the second dropdown to "No Item selected" and sets the table to the values after the first dropdown.
   */
  const clearValue = useCallback(() => {
    setValueNameSelector2State(null);

    const columnValues = getColumnValues(valueNameSelector1, trace, useOtelTerms);
    const colored = generateColor(columnValues, getValue(), checkboxStatus);
    handler(colored, colored, valueNameSelector1, null);
  }, [valueNameSelector1, trace, useOtelTerms, getValue, checkboxStatus, handler]);

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
        <Checkbox className="TraceStatisticsHeader--checkbox" onChange={checkboxButton} />
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
