// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import { JsonView, allExpanded, collapseAllNested, defaultStyles } from 'react-json-view-lite';
import { IAttribute } from '../../../../types/otel';

const jsonObjectOrArrayStartRegex = /^(\[|\{)/;

function tryParseJson(value: string) {
  try {
    return jsonObjectOrArrayStartRegex.test(value) ? JSON.parse(value) : value;
  } catch {
    return value;
  }
}

type Props = {
  attribute: IAttribute;
};

/**
 * Renders a single GenAI attribute value.
 * This handles JSON parsing and tree visualization, and serves as an extensibility point
 * for richer rendering (e.g. Markdown or images) in the future.
 */
export default function GenAIAttributeRenderer({ attribute }: Props) {
  const { value } = attribute;
  let parsed = value;

  if (typeof value === 'string') {
    parsed = tryParseJson(value);
  }

  if (typeof parsed === 'object' && parsed !== null) {
    // Expand the tree if it's relatively small
    const shouldJsonTreeExpand = Object.keys(parsed).length <= 10;
    return (
      <div className="GenAIAttributeRenderer--json">
        <JsonView
          data={parsed}
          shouldExpandNode={shouldJsonTreeExpand ? allExpanded : collapseAllNested}
          style={{
            ...defaultStyles,
            container: 'json-markup',
            label: 'json-markup-key',
            stringValue: 'json-markup-string',
            collapseIcon: 'json-markup-icon-collapse',
            collapsedContent: 'json-markup-collapse-content',
            expandIcon: 'json-markup-icon-expand',
            numberValue: 'json-markup-number',
            booleanValue: 'json-markup-bool',
            nullValue: 'json-markup-null',
            undefinedValue: 'json-markup-undefined',
            basicChildStyle: 'json-markup-child',
            punctuation: 'json-markup-puncuation',
            otherValue: 'json-markup-other',
          }}
        />
      </div>
    );
  }

  return <div className="GenAIAttributeRenderer--scalar">{String(value)}</div>;
}
