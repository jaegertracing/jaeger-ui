// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';

import type { IOtelSpan } from '../../../../../types/otel';

type Props = { span: IOtelSpan };

export default function GenAITab({ span: _span }: Props): React.ReactElement {
  return <div className="GenAITab">GenAI details coming soon.</div>;
}
