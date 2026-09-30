// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import { Tooltip } from 'antd';

import type { ISpanDecorationIcon } from './spanDecorations';
import './SpanDecorationIcon.css';

/**
 * Renders a decoration icon from {@link getSpanDecorationIcon}: Tooltip +
 * role="img" when a label is present (GenAI), bare aria-hidden glyph otherwise.
 */
export function SpanDecorationIcon({ decoration }: { decoration: ISpanDecorationIcon }): React.ReactElement {
  const { icon: Icon, label } = decoration;
  if (label) {
    return (
      <Tooltip title={label}>
        <span role="img" aria-label={label} className="SpanDecorationIcon">
          <Icon aria-hidden="true" />
        </span>
      </Tooltip>
    );
  }
  return <Icon className="SpanDecorationIcon" aria-hidden="true" />;
}
