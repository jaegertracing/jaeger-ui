// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { CopilotKit } from '@copilotkit/react-core';
import * as React from 'react';
import JaegerCopilotUi from './JaegerCopilotUi';
import { getJaegerCopilotRuntimeUrl } from './copilot-runtime';
import '@copilotkit/react-ui/styles.css';

type TProps = {
  children: React.ReactNode;
};

/*
  If a runtime URL exists, wraps children with CopilotKit (CopilotKit’s provider), 
  mounts JaegerCopilotUi, imports CopilotKit styles, and turns off inspector/dev console chrome so it doesn’t clutter the UI.
*/
export default function JaegerCopilotProvider(props: TProps) {
  const { children } = props;
  const runtimeUrl = getJaegerCopilotRuntimeUrl();

  if (!runtimeUrl) {
    return <>{children}</>;
  }

  return (
    <CopilotKit runtimeUrl={runtimeUrl} enableInspector={false} showDevConsole={false}>
      <JaegerCopilotUi />
      {children}
    </CopilotKit>
  );
}
