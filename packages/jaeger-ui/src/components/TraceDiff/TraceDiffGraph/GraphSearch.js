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
import { Icon, Input } from 'antd';
import { connect } from 'react-redux';
import { withRouter } from 'react-router-dom';
import queryString from 'query-string';

import type { Location, /* Match, */ RouterHistory } from 'react-router-dom';

import prefixUrl from '../../../utils/prefix-url';

import type { ReduxState } from '../../../types/index';

import './GraphSearch.css';

type propsType = {
  graphSearch?: string,
  history: RouterHistory,
  location: Location,
};

export function UnconnectedGraphSearch(props: propsType) {
  function inputOnChange(evt) {
    const { graphSearch, ...queryParams } = queryString.parse(props.location.search);
    const { value } = evt.target;
    if (value) {
      queryParams.graphSearch = value;
    }
    props.history.replace(prefixUrl(`?${queryString.stringify(queryParams)}`));
  }
  return (
    <div className="GraphSearch">
      <Input onChange={inputOnChange} value={props.graphSearch} />
      <Icon type="search" />
    </div>
  );
}

UnconnectedGraphSearch.defaultProps = {
  graphSearch: null,
};

export function mapStateToProps(state: ReduxState): { graphSearch?: string } {
  const { graphSearch } = queryString.parse(state.router.location.search);
  return { graphSearch };
}

export default withRouter(connect(mapStateToProps)(UnconnectedGraphSearch));
