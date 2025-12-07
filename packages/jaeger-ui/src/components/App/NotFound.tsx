// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { Link } from 'react-router-dom';

import ErrorMessage from '../common/ErrorMessage';
import prefixUrl from '../../utils/prefix-url';

type NotFoundProps = {
  error: Error | string;
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
