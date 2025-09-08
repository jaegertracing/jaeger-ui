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

import React, { useState, useMemo, useEffect } from 'react';
import { InputNumber } from 'antd';
import _debounce from 'lodash/debounce';

import NameSelector from '../common/NameSelector';

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
      <InputNumber id="inputNumber" onChange={handleInputChange} min={1} value={lookbackValue} />
      <span className="QualityMetrics--Header--LookbackSuffix">(in hours)</span>
    </header>
  );
};

export default Header;
