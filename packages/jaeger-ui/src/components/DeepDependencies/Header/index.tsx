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
import tempOptions from './tmp-data';

import { EDirection, TDdgDistanceToPathElems } from '../../../model/ddg/types';

import './index.css';

type TProps = {
  distanceToPathElems?: TDdgDistanceToPathElems;
  setDistance: (distance: number, direction: EDirection) => void;
  visEncoding?: string;
};

type TTempState = {
  service: string | null;
  operation: string | null;
};

// istanbul ignore next
const TMP_OPTIIONS = tempOptions.map(s => (s.match(/^(\S+\s+){1,12}|^\S+$/) || ['MISSING'])[0]);

export default class Header extends React.PureComponent<TProps, TTempState> {
  state = {
    service: null,
    operation: null,
  };

  setService = (service: string) => {
    // istanbul ignore next
    if (service !== this.state.service) {
      this.setState({ service, operation: null });
    }
  };

  setOperation = (operation: string) => {
    // istanbul ignore next
    this.setState({ operation });
  };

  render() {
    const { distanceToPathElems, setDistance, visEncoding } = this.props;
    const { service, operation } = this.state;

    return (
      <header className="DdgHeader">
        <div className="DdgHeader--paramsHeader">
          <NameSelector
            label="Service:"
            placeholder="Select a service…"
            value={service}
            setValue={this.setService}
            required
            options={TMP_OPTIIONS}
          />
          {service && (
            <NameSelector
              label="Operation:"
              placeholder="Select an operation…"
              value={operation}
              setValue={this.setOperation}
              required
              options={TMP_OPTIIONS}
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
