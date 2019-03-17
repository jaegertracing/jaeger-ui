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
import queryString from 'query-string';
import { connect } from 'react-redux';
import { withRouter } from 'react-router-dom';

import { History as RouterHistory, Location } from 'history';

import updateUiFind from '../../utils/update-ui-find';

import { ReduxState } from '../../types/index';

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
  ownInputValue: string | undefined;
};

export class UnconnectedUiFindInput extends React.PureComponent<PropsType, StateType> {
  static defaultProps: Partial<PropsType> = {
    forwardedRef: undefined,
    inputProps: {},
    trackFindFunction: undefined,
    uiFind: undefined,
  };

  state = {
    ownInputValue: undefined,
  };

  handleInputBlur = () => {
    this.updateUiFindQueryParam.flush();
    this.setState({ ownInputValue: undefined });
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
    const inputValue = this.state.ownInputValue ? this.state.ownInputValue : this.props.uiFind;

    // TODO: check autosize true/false
    return (
      <Input
        autosize={null}
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
