// @flow

// Copyright (c) 2018 Uber Technologies, Inc.
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
import { Button, Input } from 'antd';

import * as markers from './TracePageHeader.markers';

import './TracePageSearchBar.css';

type TracePageSearchBarProps = {
  updateTextFilter: string => void,
  textFilter: string,
  prevResult: () => void,
  nextResult: () => void,
  resultCount: number,
};

type TracePageSearchBarState = {
  textFilter: ?string,
};

export default class TracePageSearchBar extends React.PureComponent<
  TracePageSearchBarProps,
  TracePageSearchBarState
> {
  props: TracePageSearchBarProps;
  state: TracePageSearchBarState;

  constructor(props: TracePageSearchBarProps) {
    super(props);
    this.state = {
      textFilter: props.textFilter,
    };
  }

  updateTextFilter = (textFilter: string) => {
    this.props.updateTextFilter(textFilter);
    this.setState({ textFilter });
  };

  render() {
    const { prevResult, nextResult, resultCount } = this.props;

    const count = this.state.textFilter ? <span>{resultCount.toString()}</span> : null;

    return (
      <Input.Group compact style={{ display: 'flex' }}>
        <Input // ^ inline because compact overwrites the display
          name="search"
          className="TracePageSearchBar--bar ub-flex-auto"
          placeholder="Search..."
          onChange={event => this.updateTextFilter(event.target.value)}
          value={this.state.textFilter}
          data-test={markers.IN_TRACE_SEARCH}
          suffix={count}
        />
        <Button disabled={!this.state.textFilter} icon="up" onClick={prevResult} />
        <Button disabled={!this.state.textFilter} icon="down" onClick={nextResult} />
        <Button disabled={!this.state.textFilter} icon="close" onClick={() => this.updateTextFilter('')} />
      </Input.Group>
    );
  }
}
