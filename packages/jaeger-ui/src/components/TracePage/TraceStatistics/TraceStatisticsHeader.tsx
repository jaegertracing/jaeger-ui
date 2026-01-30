// Copyright (c) 2020 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { Checkbox, Select } from 'antd';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { IOtelTrace } from '../../../types/otel';
import { ITableSpan } from './types';
import { generateDropdownValue, generateSecondDropdownValue } from './generateDropdownValue';
import { getColumnValues, getColumnValuesSecondDropdown, getServiceName } from './tableValues';
import SearchableSelect from '../../common/SearchableSelect';
import generateColor from './generateColor';
import './TraceStatisticsHeader.css';

/**
 * Props for the TraceStatisticsHeader component.
 * @property {IOtelTrace} trace - The OpenTelemetry trace object containing trace information.
 * @property {ITableSpan[]} tableValue - The current filtered or displayed span data in the table.
 * @property {ITableSpan[]} wholeTable - The complete unfiltered span data for the entire trace.
 * @property {function} handler - Callback function to handle table value changes and selections.
 *   @param {ITableSpan[]} tableValue - The current table span values.
 *   @param {ITableSpan[]} wholeTable - The complete table span values.
 *   @param {string} valueNameSelector1 - The primary value selector name.
 *   @param {string | null} valueNameSelector2 - The optional secondary value selector name.
 * @property {boolean} useOtelTerms - Flag to determine whether to use OpenTelemetry terminology in the UI.
 */

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

  // This ensures that the service name is only computed once on initial render
  const initialServiceName = useMemo(() => getServiceName(), []);

  const [valueNameSelector1, setValueNameSelector1State] = useState<string>(initialServiceName);
  const [valueNameSelector2, setValueNameSelector2State] = useState<string | null>(null);
  const [valueNameSelector3, setValueNameSelector3State] = useState<string>('Count');
  const [checkboxStatus, setCheckboxStatus] = useState<boolean>(false);

  const getColorValue = useCallback(() => {
    const toColor = optionsNameSelector3.get(valueNameSelector3);
    return toColor ?? '';
  }, [valueNameSelector3]);

  useEffect(() => {
    const serviceName = getServiceName();
    handler(
      getColumnValues(serviceName, trace, useOtelTerms),
      getColumnValues(serviceName, trace, useOtelTerms),
      serviceName,
      null
    );
  }, [trace, useOtelTerms, handler]);

  const setValueNameSelector1 = useCallback(
    (value: string) => {
      setValueNameSelector1State(value);
      setValueNameSelector2State(null);
      const colorValue = getColorValue();
      const newTableValue = generateColor(
        getColumnValues(value, trace, useOtelTerms),
        colorValue,
        checkboxStatus
      );
      const newWholeTable = generateColor(
        getColumnValues(value, trace, useOtelTerms),
        colorValue,
        checkboxStatus
      );
      handler(newTableValue, newWholeTable, value, null);
    },
    [trace, useOtelTerms, handler, checkboxStatus, getColorValue]
  );

  const setValueNameSelector2 = useCallback(
    (value: string) => {
      setValueNameSelector2State(value);
      const colorValue = getColorValue();
      const newTableValue = generateColor(
        getColumnValuesSecondDropdown(tableValue, valueNameSelector1, value, trace, useOtelTerms),
        colorValue,
        checkboxStatus
      );
      const newWholeTable = generateColor(
        getColumnValuesSecondDropdown(wholeTable, valueNameSelector1, value, trace, useOtelTerms),
        colorValue,
        checkboxStatus
      );
      handler(newTableValue, newWholeTable, valueNameSelector1, value);
    },
    [tableValue, wholeTable, valueNameSelector1, trace, useOtelTerms, handler, checkboxStatus, getColorValue]
  );

  const setValueNameSelector3 = useCallback(
    (value: string) => {
      setValueNameSelector3State(value);
      const toColor = optionsNameSelector3.get(value) ?? '';
      const newTableValue = generateColor(tableValue, toColor, checkboxStatus);
      const newWholeTable = generateColor(wholeTable, toColor, checkboxStatus);
      handler(newTableValue, newWholeTable, valueNameSelector1, valueNameSelector2);
    },
    [tableValue, wholeTable, valueNameSelector1, valueNameSelector2, handler, checkboxStatus]
  );

  const checkboxButton = useCallback(
    (e: any) => {
      const checked = e.target.checked;
      setCheckboxStatus(checked);
      const colorValue = getColorValue();
      const newTableValue = generateColor(tableValue, colorValue, checked);
      const newWholeTable = generateColor(wholeTable, colorValue, checked);
      handler(newTableValue, newWholeTable, valueNameSelector1, valueNameSelector2);
    },
    [tableValue, wholeTable, valueNameSelector1, valueNameSelector2, handler, getColorValue]
  );

  const clearValue = useCallback(() => {
    setValueNameSelector2State(null);
    const colorValue = getColorValue();
    const newTableValue = generateColor(
      getColumnValues(valueNameSelector1, trace, useOtelTerms),
      colorValue,
      checkboxStatus
    );
    const newWholeTable = generateColor(
      getColumnValues(valueNameSelector1, trace, useOtelTerms),
      colorValue,
      checkboxStatus
    );
    handler(newTableValue, newWholeTable, valueNameSelector1, null);
  }, [valueNameSelector1, trace, useOtelTerms, handler, checkboxStatus, getColorValue]);

  const optionsNameSelector1 = useMemo(
    () => generateDropdownValue(trace, useOtelTerms),
    [trace, useOtelTerms]
  );
  const optionsNameSelector2Options = useMemo(
    () => generateSecondDropdownValue(trace, valueNameSelector1, useOtelTerms),
    [trace, valueNameSelector1, useOtelTerms]
  );

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
          {optionsNameSelector2Options.map(opt => (
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
