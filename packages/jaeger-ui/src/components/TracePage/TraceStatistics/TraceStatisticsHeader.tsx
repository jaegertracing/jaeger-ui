// Copyright (c) 2020 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { Checkbox, Select } from 'antd';
import React, { Component } from 'react';
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

type State = {
  valueNameSelector1: string;
  valueNameSelector2: string | null;
  valueNameSelector3: string;

  checkboxStatus: boolean;
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

export default class TraceStatisticsHeader extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    const serviceName = getServiceName();
    this.props.handler(
      getColumnValues(serviceName, this.props.trace, this.props.useOtelTerms),
      getColumnValues(serviceName, this.props.trace, this.props.useOtelTerms),
      serviceName,
      null
    );

    this.state = {
      valueNameSelector1: serviceName,
      valueNameSelector2: null,
      valueNameSelector3: 'Count',
      checkboxStatus: false,
    };
    this.setValueNameSelector1 = this.setValueNameSelector1.bind(this);
    this.setValueNameSelector2 = this.setValueNameSelector2.bind(this);
    this.setValueNameSelector3 = this.setValueNameSelector3.bind(this);
    this.checkboxButton = this.checkboxButton.bind(this);
    this.clearValue = this.clearValue.bind(this);
  }

  /**
   * Returns the value of optionsNameSelector3.
   */
  getValue() {
    let toColor = optionsNameSelector3.get(this.state.valueNameSelector3);
    if (toColor === undefined) {
      toColor = '';
    }
    return toColor;
  }

  /**
   * Is called after a value from the first dropdown is selected.
   */
  setValueNameSelector1(value: string) {
    this.setState({
      valueNameSelector1: value,
      valueNameSelector2: null,
    });
    const newTableValue = generateColor(
      getColumnValues(value, this.props.trace, this.props.useOtelTerms),
      this.getValue(),
      this.state.checkboxStatus
    );
    const newWohleTable = generateColor(
      getColumnValues(value, this.props.trace, this.props.useOtelTerms),
      this.getValue(),
      this.state.checkboxStatus
    );
    this.props.handler(newTableValue, newWohleTable, value, null);
  }

  /**
   * Is called after a value from the second dropdown is selected.
   */
  setValueNameSelector2(value: string) {
    this.setState({
      valueNameSelector2: value,
    });
    const newTableValue = generateColor(
      getColumnValuesSecondDropdown(
        this.props.tableValue,
        this.state.valueNameSelector1,
        value,
        this.props.trace,
        this.props.useOtelTerms
      ),
      this.getValue(),
      this.state.checkboxStatus
    );
    const newWohleTable = generateColor(
      getColumnValuesSecondDropdown(
        this.props.wholeTable,
        this.state.valueNameSelector1,
        value,
        this.props.trace,
        this.props.useOtelTerms
      ),
      this.getValue(),
      this.state.checkboxStatus
    );
    this.props.handler(newTableValue, newWohleTable, this.state.valueNameSelector1, value);
  }

  /**
   * Is called after a value from the third dropdown is selected.
   */
  setValueNameSelector3(value: string) {
    this.setState({
      valueNameSelector3: value,
    });

    let toColor = optionsNameSelector3.get(value);
    if (toColor === undefined) {
      toColor = '';
    }
    const newTableValue = generateColor(this.props.tableValue, toColor, this.state.checkboxStatus);
    const newWohleTable = generateColor(this.props.wholeTable, toColor, this.state.checkboxStatus);
    this.props.handler(
      newTableValue,
      newWohleTable,
      this.state.valueNameSelector1,
      this.state.valueNameSelector2
    );
  }

  /**
   * Is called after the checkbox changes its status.
   */
  checkboxButton(e: any) {
    this.setState({
      checkboxStatus: e.target.checked,
    });

    const newTableValue = generateColor(this.props.tableValue, this.getValue(), e.target.checked);
    const newWholeTable = generateColor(this.props.wholeTable, this.getValue(), e.target.checked);
    this.props.handler(
      newTableValue,
      newWholeTable,
      this.state.valueNameSelector1,
      this.state.valueNameSelector2
    );
  }

  /**
   * Sets the second dropdown to "No Item selected" and sets the table to the values after the first dropdown.
   */
  clearValue() {
    this.setState({
      valueNameSelector2: null,
    });

    const newTableValue = generateColor(
      getColumnValues(this.state.valueNameSelector1, this.props.trace, this.props.useOtelTerms),
      this.getValue(),
      this.state.checkboxStatus
    );
    const newWholeTable = generateColor(
      getColumnValues(this.state.valueNameSelector1, this.props.trace, this.props.useOtelTerms),
      this.getValue(),
      this.state.checkboxStatus
    );
    this.props.handler(newTableValue, newWholeTable, this.state.valueNameSelector1, null);
  }

  render() {
    const optionsNameSelector1 = generateDropdownValue(this.props.trace, this.props.useOtelTerms);
    const optionsNameSelector2 = generateSecondDropdownValue(
      this.props.trace,
      this.state.valueNameSelector1,
      this.props.useOtelTerms
    );

    return (
      <div className="TraceStatisticsHeader">
        <label className="TraceStatisticsHeader--label">
          <span className="TraceStatisticsHeader--labelText">Group By:</span>
          <SearchableSelect
            className="TraceStatisticsHeader--select"
            value={this.state.valueNameSelector1}
            onChange={this.setValueNameSelector1}
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
            value={this.state.valueNameSelector2}
            onChange={this.setValueNameSelector2}
            allowClear
            onClear={this.clearValue}
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
          <Checkbox className="TraceStatisticsHeader--checkbox" onChange={this.checkboxButton} />
          <label className="TraceStatisticsHeader--label">
            <span className="TraceStatisticsHeader--labelText">Color by:</span>
            <SearchableSelect
              className="TraceStatisticsHeader--select"
              value={this.state.valueNameSelector3}
              onChange={this.setValueNameSelector3}
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
}
