// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import { JsonView, collapseAllNested, defaultStyles } from 'react-json-view-lite';
import { IoChevronDown, IoChevronForward } from 'react-icons/io5';
import 'react-json-view-lite/dist/index.css';

import { IAttribute } from '../../../../types/otel';
import { RICH_MEDIA_ATTRIBUTE_KEYS } from '../../../../utils/genai/detect';

import './AccordionGenAIAttributes.css';

/**
 * The set of OTel GenAI semantic-convention attribute keys that contain
 * serialised JSON and warrant rich tree rendering instead of a flat row.
 *
 * @see https://opentelemetry.io/docs/specs/semconv/gen-ai/
 */
export const GENAI_RICH_ATTRIBUTE_KEYS = new Set(Object.keys(RICH_MEDIA_ATTRIBUTE_KEYS));

type SingleAttributeRowProps = {
  attribute: IAttribute;
};

/**
 * Renders a single GenAI attribute as a collapsible accordion.
 * JSON parsing is deferred until the accordion is opened (lazy).
 */
function SingleAttributeRow({ attribute }: SingleAttributeRowProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  const parsed = React.useMemo(() => {
    if (!isOpen) return null;
    const raw = attribute.value;
    if (typeof raw !== 'string') return raw;
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  }, [isOpen, attribute.value]);

  const toggle = React.useCallback(() => setIsOpen(prev => !prev), []);

  const isParsedObject = isOpen && parsed !== null && typeof parsed === 'object';

  return (
    <div className="AccordionGenAIAttributes--row">
      <div
        className="AccordionGenAIAttributes--header"
        role="switch"
        aria-checked={isOpen}
        onClick={toggle}
        data-testid={`genai-attr-toggle-${attribute.key}`}
      >
        {isOpen ? (
          <IoChevronDown className="u-align-icon AccordionGenAIAttributes--icon" />
        ) : (
          <IoChevronForward className="u-align-icon AccordionGenAIAttributes--icon" />
        )}
        <span className="AccordionGenAIAttributes--key">{attribute.key}</span>
        {!isOpen && (
          <span className="AccordionGenAIAttributes--preview" aria-hidden="true">
            {String(attribute.value).slice(0, 120)}
            {String(attribute.value).length > 120 ? '…' : ''}
          </span>
        )}
      </div>
      {isOpen && (
        <div className="AccordionGenAIAttributes--body" data-testid={`genai-attr-body-${attribute.key}`}>
          {isParsedObject ? (
            <JsonView
              data={parsed}
              shouldExpandNode={collapseAllNested}
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
          ) : (
            <span className="AccordionGenAIAttributes--rawValue">{String(attribute.value)}</span>
          )}
        </div>
      )}
    </div>
  );
}

type AccordionGenAIAttributesProps = {
  data: ReadonlyArray<IAttribute>;
};

/**
 * Renders a list of GenAI span attributes, each as its own collapsible
 * accordion with a JsonView tree renderer.  Attributes are all initially
 * collapsed so large JSON payloads are never parsed at trace-render time.
 */
export default function AccordionGenAIAttributes({ data }: AccordionGenAIAttributesProps) {
  if (!Array.isArray(data) || data.length === 0) {
    return null;
  }

  return (
    <div className="AccordionGenAIAttributes" data-testid="genai-attributes">
      {data.map((attr, i) => (
        // `i` guard against duplicate keys (same pattern as AccordionAttributes)
        <SingleAttributeRow key={`${attr.key}-${i}`} attribute={attr} />
      ))}
    </div>
  );
}
