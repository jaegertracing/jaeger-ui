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
import React from 'react';
import { Link } from 'react-router-dom';

import prefixUrl from '../../utils/prefix-url';

export default function NotFound({ error }) {
  return (
    <section className="ui container">
      <div className="ui center aligned basic segment">
        <div className="ui center aligned basic segment">
          <h1>{'404'}</h1>
          <p>{"Looks like you tried to access something that doesn't exist."}</p>
        </div>
        {error && (
          <div className="ui red message">
            <p>{String(error)}</p>
          </div>
        )}
        <div className="ui center aligned basic segment">
          <Link to={prefixUrl('/')}>{'Back home'}</Link>
        </div>
      </div>
    </section>
  );
}

NotFound.propTypes = {
  error: PropTypes.object,
};
