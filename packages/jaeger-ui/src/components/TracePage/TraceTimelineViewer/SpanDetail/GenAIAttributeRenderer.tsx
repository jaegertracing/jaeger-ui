// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { JsonView, allExpanded, collapseAllNested } from 'react-json-view-lite';

import { RICH_MEDIA_ATTRIBUTE_KEYS } from '../../../../utils/genai/detect';
import jsonViewStyles from '../../../../utils/jsonViewStyles';
import type { IAttribute } from '../../../../types/otel';

type Props = {
  attribute: IAttribute;
  isOpen: boolean;
};

function tryParseJson(value: unknown): unknown | null {
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }
  if (typeof value === 'object' && value !== null) {
    return value;
  }
  return null;
}

/**
 * Extracts human-readable text from a gen_ai messages attribute value.
 * The OTel GenAI spec stores messages as a JSON array of objects with
 * a 'content' field. Falls back to the raw string if parsing fails.
 */
function extractMessageText(value: unknown): string {
  const parsed = tryParseJson(value);
  if (Array.isArray(parsed)) {
    return parsed
      .map(msg => {
        if (typeof msg === 'object' && msg !== null && 'content' in msg) {
          const rec = msg as Record<string, unknown>;
          const roleStr = typeof rec.role === 'string' && rec.role ? `[${rec.role}]\n` : '';
          return `${roleStr}${String(rec.content)}`;
        }
        return String(msg);
      })
      .join('\n\n');
  }
  return typeof value === 'string' ? value : JSON.stringify(value, null, 2);
}

type JsonRendererProps = { value: unknown };

function JsonRenderer({ value }: JsonRendererProps) {
  const parsed = tryParseJson(value);
  if (parsed !== null) {
    const isSmall = typeof parsed === 'object' && parsed !== null && Object.keys(parsed).length <= 10;
    return (
      <div className="GenAIAttributeRenderer--json">
        <JsonView
          data={parsed}
          shouldExpandNode={isSmall ? allExpanded : collapseAllNested}
          style={jsonViewStyles}
        />
      </div>
    );
  }
  // Fallback: raw string if JSON parse fails
  return <pre className="GenAIAttributeRenderer--pre">{String(value)}</pre>;
}

type MarkdownRendererProps = { value: unknown };

function MarkdownRenderer({ value }: MarkdownRendererProps) {
  const text = extractMessageText(value);
  return <pre className="GenAIAttributeRenderer--pre">{text}</pre>;
}

/**
 * Renders rich content for specific OTel GenAI attributes when the
 * containing accordion section is open. Returns null for any attribute
 * key not in RICH_MEDIA_ATTRIBUTE_KEYS, ensuring zero cost for
 * non-GenAI spans.
 */
export default function GenAIAttributeRenderer({ attribute, isOpen }: Props): React.ReactElement | null {
  if (!Object.hasOwn(RICH_MEDIA_ATTRIBUTE_KEYS, attribute.key)) return null;
  const renderKind = RICH_MEDIA_ATTRIBUTE_KEYS[attribute.key];

  // Lazy: do not parse or render when the section is collapsed
  if (!isOpen) return null;

  return (
    <div className="GenAIAttributeRenderer">
      <span className="GenAIAttributeRenderer--key">{attribute.key}</span>
      {renderKind === 'json' ? (
        <JsonRenderer value={attribute.value} />
      ) : (
        <MarkdownRenderer value={attribute.value} />
      )}
    </div>
  );
}
