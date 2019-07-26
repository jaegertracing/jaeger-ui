// Copyright (c) 2019 Uber Technologies, Inc.
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

import HopsSelector from './HopsSelector';
import NameSelector from './NameSelector';
import { EDirection, TDdgDistanceToPathElems } from '../../../model/ddg/types';

import './index.css';

type TProps = {
  distanceToPathElems?: TDdgDistanceToPathElems;
  operation?: string;
  operationsForService: Record<string, string[]>;
  service?: string;
  services?: string[] | null;
  setDistance: (distance: number, direction: EDirection) => void;
  setOperation: (operation: string) => void;
  setService: (service: string) => void;
  visEncoding?: string;
};

export default class Header extends React.PureComponent<TProps> {
  render() {
    const {
      distanceToPathElems,
      operation,
      operationsForService,
      service,
      services,
      setDistance,
      setOperation,
      setService,
      visEncoding,
    } = this.props;

    return (
      <header className="DdgHeader">
        <div className="DdgHeader--paramsHeader">
          <NameSelector
            label="Service:"
            placeholder="Select a service…"
            value={service || null}
            setValue={setService}
            required
            options={services || []}
          />
          {service && (
            <NameSelector
              label="Operation:"
              placeholder="Select an operation…"
              value={operation || null}
              setValue={setOperation}
              required
              options={operationsForService[service] || []}
            />
          )}
        </div>
        <div className="DdgHeader--controlHeader">
          {distanceToPathElems && (
            <HopsSelector
              distanceToPathElems={distanceToPathElems}
              handleClick={setDistance}
              visEncoding={visEncoding}
            />
          )}
        </div>
      </header>
    );
  }
}
