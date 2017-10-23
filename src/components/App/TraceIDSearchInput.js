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

import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { withRouter } from 'react-router-dom';

class TraceIDSearchInput extends Component {
  goToTrace(e) {
    this.props.history.push(`/trace/${this.traceIDInput.value}`);
    e.preventDefault();
    return false;
  }
  render() {
    return (
      <form onSubmit={e => this.goToTrace(e)}>
        <input
          type="text"
          placeholder="Lookup by Trace ID..."
          ref={input => {
            this.traceIDInput = input;
          }}
        />
      </form>
    );
  }
}

TraceIDSearchInput.propTypes = {
  history: PropTypes.shape({
    push: PropTypes.func,
  }).isRequired,
};

export default withRouter(TraceIDSearchInput);
