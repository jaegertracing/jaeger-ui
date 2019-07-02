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

import React, { PureComponent } from 'react';
import { Input } from 'antd';
import { History as RouterHistory, Location } from 'history';
import queryString from 'query-string';

// import './index.css';
import { TDdgActionMeta } from '../../model/ddg/types';

type TState = {
  end?: number;
  operation?: string;
  service?: string;
  start?: number;
};

type TProps = TState & {
  fetchDeepDependencyGraph: (query: TDdgActionMeta['query']) => void;
  history: RouterHistory;
  location: Location;
};

/*
 * This is a very crudely thrown-together component to act as a stand in until the header is properly
 * implemented. Currently this should suffice as a means to provide the arguments to fetch a ddg, but it is
 * far from an enjoyable experience to do so.
 * TODO: Remove exception from code coverage in package.json
 */
export default class Header extends PureComponent<TProps, TState> {
  constructor(props: TProps) {
    super(props);
    this.state = {};

    const { service, operation, end = Date.now(), start: startProp } = this.props;
    const start = startProp || end - 60 * 60 * 1000;
    if (service != null && operation != null) {
      this.props.fetchDeepDependencyGraph({
        service,
        operation,
        end,
        start,
      });

      if (end !== this.props.end || start !== this.props.start) {
        // old visibilityKey is not applicable to new ddg, and probably should not have been provided without
        // start and end params
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { visibilityKey: _vk, ...readOnlyQueryParams } = queryString.parse(this.props.location.search);
        const queryParams = Object.assign({}, readOnlyQueryParams, { start, end });
        this.props.history.replace({
          ...this.props.location,
          search: `?${queryString.stringify(queryParams)}`,
        });
      }
    }
  }

  handleBlur = (name: keyof TState, evt: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = evt.target;
    this.setState({ [name]: undefined });
    // old visibilityKey is not applicable to new ddg
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { visibilityKey: _vk, ...readOnlyQueryParams } = queryString.parse(this.props.location.search);
    const queryParams = Object.assign({}, readOnlyQueryParams, { [name]: value });
    const fetchArg: TState = {
      end: name === 'end' ? +value : this.props.end,
      start: name === 'start' ? +value : this.props.start,
      service: name === 'service' ? value : this.props.service,
      operation: name === 'operation' ? value : this.props.operation,
    };
    if (fetchArg.end == null) {
      fetchArg.end = Date.now();
      queryParams.end = `${fetchArg.end}`;
    }
    if (fetchArg.start == null) {
      fetchArg.start = fetchArg.end - 60 * 60 * 1000;
      queryParams.start = `${fetchArg.start}`;
    }
    // TODO: may need to check for both service and operation in early MVP
    if (fetchArg.service != null) {
      this.props.fetchDeepDependencyGraph(fetchArg as TDdgActionMeta['query']);
    }

    this.props.history.replace({
      ...this.props.location,
      search: `?${queryString.stringify(queryParams)}`,
    });
  };

  handleChange = (name: keyof TState, evt: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = evt.target;
    this.setState({ [name]: value });
  };

  renderInput = (name: keyof TState, suffix?: string): React.ReactNode => {
    return (
      <form>
        <label htmlFor={name}>
          {name} {suffix}
        </label>
        <Input
          autosize={null}
          onBlur={this.handleBlur.bind(this, name) /* eslint-disable-line react/jsx-no-bind */}
          onChange={this.handleChange.bind(this, name) /* eslint-disable-line react/jsx-no-bind */}
          id={name}
          value={this.state[name] == null ? this.props[name] : this.state[name]}
        />
      </form>
    );
  };

  render() {
    return (
      <div>
        {this.renderInput('service')}
        {this.renderInput('operation')}
        {this.renderInput('start', 'in ms')}
        {this.renderInput('end', 'in ms')}
      </div>
    );
  }
}
