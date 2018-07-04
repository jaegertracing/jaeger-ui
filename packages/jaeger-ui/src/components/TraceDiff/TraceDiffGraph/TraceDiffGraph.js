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

import ErrorMessage from '../../common/ErrorMessage';
import LoadingIndicator from '../../common/LoadingIndicator';
import { fetchedState } from '../../../constants';
import TraceDag from '../../../model/trace-dag/TraceDag';

import type { FetchedTrace } from '../../../types';

import './TraceDiffGraph.css';

type Props = {
  a: ?FetchedTrace,
  b: ?FetchedTrace,
};

function CallToAction(props: { message: string }) {
  const { message } = props;
  return <h1 className="u-mt-vast u-tx-muted ub-tx-center">{message}</h1>;
}

const messages = {
  A: 'A: At least two Traces are needed',
  B: 'B: At least two Traces are needed',
  NONE: 'At least two Traces are needed',
};

export default function TraceDiffGraph(props: Props) {
  const { a, b } = props;
  if (!a || !b) {
    let text = messages.NONE;
    if (a) {
      text = messages.B;
    } else if (b) {
      text = messages.A;
    }
    return <CallToAction message={text} />;
  }
  if (a.error || b.error) {
    return (
      <div className="TraceDiffGraph--errorsWrapper">
        {a.error ? (
          <ErrorMessage className="ub-my4" error={a.error} messageClassName="TraceDiffGraph--errorMessage" />
        ) : null}
        {b.error ? (
          <ErrorMessage className="ub-my4" error={b.error} messageClassName="TraceDiffGraph--errorMessage" />
        ) : null}
      </div>
    );
  }
  if (a.state === fetchedState.LOADING || b.state === fetchedState.LOADING) {
    return <LoadingIndicator className="u-mt-vast" centered />;
  }
  if (a.data) {
    console.log(new TraceDag(a.data));
  }

  return <div className="TraceDiffGraph">{}</div>;
}
