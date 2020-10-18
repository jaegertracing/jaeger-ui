// Copyright (c) 2020 Uber Technologies, Inc.
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
import { InputNumber } from 'antd';
import _debounce from 'lodash/debounce';

import NameSelector from '../common/NameSelector';

import './Header.css';

type TProps = {
  lookback: number;
  service?: string;
  services?: string[] | null;
  setLookback: (lookback: number | string | undefined) => void;
  setService: (service: string) => void;
};

type TState = {
  ownInputValue: number | undefined;
};

export default class Header extends React.PureComponent<TProps, TState> {
  state: TState = {
    ownInputValue: undefined,
  };

  setLookback = _debounce((lookback: number | string | undefined) => {
    this.setState({ ownInputValue: undefined });
    this.props.setLookback(lookback);
  }, 350);

  handleInputChange = (value: string | number | undefined) => {
    if (typeof value === 'string') return;
    this.setState({ ownInputValue: value });
    this.setLookback(value);
  };

  render() {
    const { lookback, service, services, setService } = this.props;
    const { ownInputValue } = this.state;
    const lookbackValue = ownInputValue !== undefined ? ownInputValue : lookback;

    return (
      <header className="QualityMetrics--Header">
        <NameSelector
          label="Service"
          placeholder="Select a service…"
          value={service || null}
          setValue={setService}
          required
          options={services || []}
        />
        <label className="QualityMetrics--Header--LookbackLabel" htmlFor="inputNumber">
          Lookback:
        </label>
        <InputNumber id="inputNumber" onChange={this.handleInputChange} min={1} value={lookbackValue} />
        <span className="QualityMetrics--Header--LookbackSuffix">(in hours)</span>
      </header>
    );
  }
}
