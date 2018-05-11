// @flow

// Copyright (c) 2017 Uber Technologies, Inc.
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
import { Form, Input } from 'antd';
import { withRouter } from 'react-router-dom';

import type { RouterHistory } from 'react-router-dom';

import prefixUrl from '../../utils/prefix-url';

import './TraceIDSearchInput.css';

type Props = {
  history: RouterHistory,
};

class TraceIDSearchInput extends React.PureComponent<Props> {
  props: Props;

  goToTrace = event => {
    event.preventDefault();
    const value = event.target.elements.idInput.value;
    if (value) {
      this.props.history.push(prefixUrl(`/trace/${value}`));
    }
  };

  render() {
    return (
      <Form layout="horizontal" onSubmit={this.goToTrace} className="TraceIDSearchInput--form">
        <Input name="idInput" placeholder="Lookup by Trace ID..." />
      </Form>
    );
  }
}

export default withRouter(TraceIDSearchInput);
