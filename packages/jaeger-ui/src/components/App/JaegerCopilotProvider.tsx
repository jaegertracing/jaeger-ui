// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { CopilotKit } from '@copilotkit/react-core';
import * as React from 'react';
import JaegerCopilotUi from './JaegerCopilotUi';
import { getJaegerCopilotRuntimeUrl } from './copilot-runtime';

type TProps = {
  children: React.ReactNode;
};

/*
  If a runtime URL exists, wraps children with CopilotKit (CopilotKit’s provider),
  mounts JaegerCopilotUi, loads CopilotKit UI styles (dynamic import so they are not bundled when assistant is off),
  and turns off inspector/dev console chrome so it doesn’t clutter the UI.
*/
export default function JaegerCopilotProvider(props: TProps) {
  const { children } = props;
  const runtimeUrl = getJaegerCopilotRuntimeUrl();

  React.useEffect(() => {
    if (!runtimeUrl) {
      return;
    }
    void import('@copilotkit/react-ui/styles.css');
  }, [runtimeUrl]);

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
