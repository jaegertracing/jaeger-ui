// Copyright (c) 2022 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { FlamegraphRenderer, convertJaegerTraceToProfile } from '@pyroscope/flamegraph';
import _cloneDeep from 'lodash/cloneDeep';

import { useThemeMode } from '../../App/ThemeProvider';

import '@pyroscope/flamegraph/dist/index.css';
import './index.css';

const TraceFlamegraph = ({ trace }: any) => {
  const { mode } = useThemeMode();

  // Cloned b/c convertJaegerTraceToProfile or FlamegraphRenderer can possibly mutate the trace
  // https://github.com/jaegertracing/jaeger-ui/issues/2483
  const convertedProfile = trace && trace.data ? convertJaegerTraceToProfile(_cloneDeep(trace.data)) : null;

  return (
    <div className="Flamegraph-wrapper" data-testid="flamegraph-wrapper">
      <FlamegraphRenderer colorMode={mode} profile={convertedProfile} />
    </div>
  );
};

export default TraceFlamegraph;
