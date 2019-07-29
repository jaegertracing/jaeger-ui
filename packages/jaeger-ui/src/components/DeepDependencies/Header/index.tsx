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
import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';

import HopsSelector from './HopsSelector';
import NameSelector from './NameSelector';
import UiFindInput from '../../common/UiFindInput';
import * as jaegerApiActions from '../../../actions/jaeger-api';
import { EDirection, TDdgDistanceToPathElems } from '../../../model/ddg/types';
import { ReduxState } from '../../../types/index';

import './index.css';

type TDispatchProps = {
  fetchServices: () => void;
  fetchServiceOperations: (service: string) => void;
};

type TReduxProps = {
  // TODO: Take array
  operationsForService: Record<string, string[]>;
  services?: string[] | null;
};

type TProps = TDispatchProps &
  TReduxProps & {
    distanceToPathElems?: TDdgDistanceToPathElems;
    inputSuffix: string | undefined;
    operation?: string;
    service?: string;
    setDistance: (distance: number, direction: EDirection) => void;
    setOperation: (operation: string) => void;
    setService: (service: string) => void;
    visEncoding?: string;
  };

export class HeaderImpl extends React.PureComponent<TProps> {
  constructor(props: TProps) {
    super(props);

    const { fetchServices, fetchServiceOperations, operationsForService, service, services } = props;

    if (!services) {
      fetchServices();
    }
    if (service && !Reflect.has(operationsForService, service)) {
      fetchServiceOperations(service);
    }
  }

  setService = (service: string) => {
    const { fetchServiceOperations, setService, operationsForService } = this.props;
    if (!Reflect.has(operationsForService, service)) {
      fetchServiceOperations(service);
    }
    setService(service);
  };

  render() {
    const {
      distanceToPathElems,
      inputSuffix,
      operation,
      operationsForService,
      service,
      services,
      setOperation,
      setDistance,
      visEncoding,
    } = this.props;

    return (
      <header className="DdgHeader">
        <div className="DdgHeader--paramsHeader">
          <NameSelector
            label="Service:"
            placeholder="Select a service…"
            value={service || null}
            setValue={this.setService}
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
          <UiFindInput inputProps={{ className: 'DdgHeader--uiFind', suffix: inputSuffix }} />
        </div>
      </header>
    );
  }
}

export function mapStateToProps(state: ReduxState): TReduxProps {
  const { services: stServices } = state;
  const { services, operationsForService } = stServices;
  return {
    services,
    operationsForService,
  };
}

export function mapDispatchToProps(dispatch: Dispatch<ReduxState>): TDispatchProps {
  const { fetchServiceOperations, fetchServices } = bindActionCreators(jaegerApiActions, dispatch);
  return {
    fetchServiceOperations,
    fetchServices,
  };
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(HeaderImpl);
