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
import _isString from 'lodash/isString';
import { connect } from 'react-redux';
import { withRouter } from 'react-router-dom';
import queryString from 'query-string';

import { History as RouterHistory, Location } from 'history'; // eslint-disable-line no-unused-vars

import updateUiFind from '../../utils/update-ui-find';

import { ReduxState } from '../../types/index'; // eslint-disable-line no-unused-vars

type OwnPropsType = {
  forwardedRef?: { current: Input | null };
  inputProps?: Object;
  history: RouterHistory;
  location: Location;
  match: any;
  // todo
  trackFindFunction?: (str: string | null | undefined) => void;
};

type extractUiFindFromStateReturn = {
  uiFind?: string;
};

type PropsType = OwnPropsType & extractUiFindFromStateReturn;

type StateType = {
  ownInputValue: string | null;
};

export class UnconnectedUiFindInput extends React.PureComponent<PropsType, StateType> {
  static defaultProps: Partial<PropsType> = {
    forwardedRef: undefined,
    inputProps: {},
    trackFindFunction: undefined,
    uiFind: undefined,
  };

  state = {
    ownInputValue: null,
  };

  handleInputBlur = () => {
    this.updateUiFindQueryParam.flush();
    this.setState({ ownInputValue: null });
  };

  handleInputChange = (evt: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = evt.target;
    this.updateUiFindQueryParam(value);
    this.setState({ ownInputValue: value });
  };

  updateUiFindQueryParam = _debounce((uiFind: string | undefined) => {
    const { history, location, trackFindFunction } = this.props;
    updateUiFind({
      location,
      history,
      trackFindFunction,
      uiFind,
    });
  }, 250);

  render() {
    // TODO: typescript should know that inputValue is a string
    const inputValue = (_isString(this.state.ownInputValue)
      ? this.state.ownInputValue
      : this.props.uiFind) as string | undefined;

    // TODO: check autosize true/false
    return (
      <Input
        autosize
        placeholder="Find..."
        {...this.props.inputProps}
        onBlur={this.handleInputBlur}
        onChange={this.handleInputChange}
        ref={this.props.forwardedRef}
        value={inputValue}
      />
    );
  }
}

export function extractUiFindFromState(state: ReduxState): extractUiFindFromStateReturn {
  // TODO: Handle the fact that uiFind could be an array of strings
  const { uiFind }: { uiFind?: string } = queryString.parse(state.router.location.search);
  return { uiFind };
}

export default withRouter(connect(extractUiFindFromState)(UnconnectedUiFindInput));
