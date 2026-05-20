// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAui, Tools } from '@assistant-ui/react';

import { createJaegerAssistantToolkit } from './jaegerAssistantTools';

/**
 * Registers the Jaeger assistant frontend tools (e.g. highlight_span) with the
 * active AssistantRuntimeProvider. Must be mounted inside both AssistantRuntimeProvider
 * and a React Router context.
 *
 * Renders nothing; exists only for its side-effect of registering tools via useAui.
 */
export default function JaegerAssistantToolsRegistrar() {
  const navigate = useNavigate();
  const location = useLocation();

  const toolkit = React.useMemo(
    () => createJaegerAssistantToolkit({ navigate, location }),
    [navigate, location]
  );

  useAui({ tools: Tools({ toolkit }) });

  return null;
}
