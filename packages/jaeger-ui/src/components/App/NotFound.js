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

import React from 'react';
import { Link } from 'react-router-dom';

import ErrorMessage from '../common/ErrorMessage';
import prefixUrl from '../../utils/prefix-url';

type NotFoundProps = {
  error: any,
};

export default function NotFound({ error }: NotFoundProps) {
  return (
    <section className="ub-m3">
      <h1>Error</h1>
      {error && <ErrorMessage error={error} />}
      <Link to={prefixUrl('/')}>Back home</Link>
    </section>
  );
}
