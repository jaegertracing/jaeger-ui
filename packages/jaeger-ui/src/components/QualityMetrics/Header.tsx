// Copyright (c) 2020 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import React, { useState, useMemo, useEffect } from 'react';
import { InputNumber, Select } from 'antd';
import _debounce from 'lodash/debounce';

import SearchableSelect from '../common/SearchableSelect';

import './Header.css';

type TProps = {
  lookback: number;
  service?: string;
  services?: string[] | null;
  setLookback: (lookback: number | null) => void;
  setService: (service: string) => void;
};

const Header: React.FC<TProps> = ({ lookback, service, services, setLookback, setService }) => {
  const [ownInputValue, setOwnInputValue] = useState<number | null>(null);

  const debouncedSetLookback = useMemo(
    () =>
      _debounce((value: number | null) => {
        setOwnInputValue(null);
        setLookback(value);
      }, 350),
    [setLookback]
  );

  useEffect(() => {
    return () => {
      debouncedSetLookback.cancel();
    };
  }, [debouncedSetLookback]);

  const handleInputChange = (value: number | string | null) => {
    if (typeof value !== 'string') {
      setOwnInputValue(value);
      debouncedSetLookback(value);
    }
  };

  const lookbackValue = ownInputValue !== null ? ownInputValue : lookback;

  return (
    <header className="QualityMetrics--Header">
      <label className="QualityMetrics--Header--ServiceLabel">
        <span className="QualityMetrics--Header--ServiceLabelText">Service:</span>
        <SearchableSelect
          className="QualityMetrics--Header--ServiceSelect"
          value={service || null}
          onChange={setService}
          placeholder="Select a service…"
          popupMatchSelectWidth={false}
          fuzzy
          status={!service ? 'error' : undefined}
        >
          {(services || []).map(opt => (
            <Select.Option key={opt} value={opt}>
              {opt}
            </Select.Option>
          ))}
        </SearchableSelect>
      </label>
      <label className="QualityMetrics--Header--LookbackLabel" htmlFor="inputNumber">
        Lookback:
      </label>
      <InputNumber id="inputNumber" onChange={handleInputChange} min={1} value={lookbackValue} />
      <span className="QualityMetrics--Header--LookbackSuffix">(in hours)</span>
    </header>
  );
};

export default Header;
