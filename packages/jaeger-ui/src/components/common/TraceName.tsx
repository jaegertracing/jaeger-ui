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

import BreakableText from './BreakableText';
import LoadingIndicator from './LoadingIndicator';
import { fetchedState, FALLBACK_TRACE_NAME } from '../../constants';

import { FetchedState, TNil } from '../../types';
import { ApiError } from '../../types/api-error';

import './TraceName.css';

type Props = {
  className?: string;
  error?: ApiError | TNil;
  state?: FetchedState | TNil;
  traceName?: string | TNil;
};

export default function TraceName(props: Props) {
  const { className, error, state, traceName } = props;
  const isErred = state === fetchedState.ERROR;
  let title: string | React.ReactNode = traceName || FALLBACK_TRACE_NAME;
  let errorCssClass = '';
  if (isErred) {
    errorCssClass = 'is-error';
    let titleStr = '';
    if (error) {
      titleStr = typeof error === 'string' ? error : error.message || String(error);
    }
    if (!titleStr) {
      titleStr = 'Error: Unknown error';
    }
    title = titleStr;
    title = <BreakableText text={titleStr} />;
  } else if (state === fetchedState.LOADING) {
    title = <LoadingIndicator small />;
  } else {
    const text = String(traceName || FALLBACK_TRACE_NAME);
    title = <BreakableText text={text} />;
  }
  return <span className={`TraceName ${errorCssClass} ${className || ''}`}>{title}</span>;
}
