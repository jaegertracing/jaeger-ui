// Copyright (c) 2022 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { FlamegraphRenderer, convertJaegerTraceToProfile } from '@pyroscope/flamegraph';
import _cloneDeep from 'lodash/cloneDeep';

import { useThemeMode } from '../../App/ThemeProvider';
import OtelTraceFacade from '../../../model/OtelTraceFacade';

import '@pyroscope/flamegraph/dist/index.css';
import './index.css';

const TraceFlamegraph = ({ trace }: any) => {
  const { mode } = useThemeMode();

  // convertJaegerTraceToProfile expects the legacy Jaeger Trace shape (operationName, process, etc.).
  // IOtelTrace is backed by OtelTraceFacade, so use toLegacyTrace() to get the compatible shape.
  // Cloned b/c convertJaegerTraceToProfile or FlamegraphRenderer can possibly mutate the trace
  // https://github.com/jaegertracing/jaeger-ui/issues/2483
  const legacyTrace = trace instanceof OtelTraceFacade ? trace.toLegacyTrace() : null;
  const convertedProfile = legacyTrace ? convertJaegerTraceToProfile(_cloneDeep(legacyTrace)) : null;

  return (
    <div className="Flamegraph-wrapper" data-testid="flamegraph-wrapper">
      <FlamegraphRenderer colorMode={mode} profile={convertedProfile} />
    </div>
  );
};

export default TraceFlamegraph;
