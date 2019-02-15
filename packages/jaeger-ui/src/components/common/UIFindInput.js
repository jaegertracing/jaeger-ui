// @flow

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
import { Input } from 'antd';
import _debounce from 'lodash/debounce';
import { connect } from 'react-redux';
import { withRouter } from 'react-router-dom';
import queryString from 'query-string';

import type { Location, RouterHistory } from 'react-router-dom';

import updateUIFind from '../../utils/update-ui-find';

import type { ReduxState } from '../../types/index';

type PropsType = {
  forwardedRef?: { current: Input | null },
  inputProps: Object,
  history: RouterHistory,
  location: Location,
  uiFind?: string,
};

type StateType = {
  ownInputValue: ?string,
};

export class UnconnectedUIFindInput extends React.PureComponent<PropsType, StateType> {
  static defaultProps = {
    forwardedRef: null,
    inputProps: {},
    uiFind: null,
  };

  state = {
    ownInputValue: null,
  };

  handleInputBlur = () => {
    this.updateUIFindQueryParam.flush();
    this.setState({ ownInputValue: null });
  };

  handleInputChange = (evt: SyntheticInputEvent<HTMLInputElement>) => {
    const { value } = evt.target;
    this.updateUIFindQueryParam(value);
    this.setState({ ownInputValue: value });
  };

  updateUIFindQueryParam = _debounce((uiFind: ?string) => {
    const { history, location } = this.props;
    updateUIFind({
      location,
      history,
      uiFind,
    });
  }, 250);

  render() {
    const inputValue =
      typeof this.state.ownInputValue === 'string' ? this.state.ownInputValue : this.props.uiFind;

    return (
      <Input
        {...this.props.inputProps}
        onBlur={this.handleInputBlur}
        onChange={this.handleInputChange}
        ref={this.props.forwardedRef}
        value={inputValue}
      />
    );
  }
}

export function extractUIFindFromState(state: ReduxState): { uiFind?: string } {
  const { uiFind } = queryString.parse(state.router.location.search);
  return { uiFind };
}

export default withRouter(connect(extractUIFindFromState)(UnconnectedUIFindInput));
