// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React, { useMemo, useState } from 'react';
import { JsonView, allExpanded, collapseAllNested } from 'react-json-view-lite';

import {
  extractGenAiData,
  hasAnyTokenUsage,
  formatTokenCount,
  tryParseJson,
  GenAiMessage,
} from './genAiData';
import AccordionAttributes from '../AccordionAttributes';
import jsonViewStyles from '../../../../../utils/jsonViewStyles';
import CopyIcon from '../../../../common/CopyIcon';
import type { IOtelSpan } from '../../../../../types/otel';

import './index.css';

type Props = { span: IOtelSpan };

function MessageBlock({ message, index }: { message: GenAiMessage; index: number }) {
  return (
    <div className={`GenAITab--message GenAITab--message-${message.role || 'unknown'}`}>
      <div className="GenAITab--messageHeader">
        <span className="GenAITab--messageRole">{message.role || 'message'}</span>
        <CopyIcon copyText={message.content} tooltipTitle="Copy message" buttonText="Copy" />
      </div>
      <pre className="GenAITab--messageContent" data-testid={`genai-message-${index}`}>
        {message.content}
      </pre>
    </div>
  );
}

function JsonBlock({ value }: { value: unknown }) {
  // Tool call arguments/results may arrive already parsed or as a JSON-encoded
  // string, same as gen_ai.input.messages - try to parse strings so they get
  // the interactive tree view too, not just a raw text dump. tryParseJson only
  // attempts JSON.parse when the string looks like an object/array literal,
  // same guard AttributesTable uses, so plain non-JSON strings (the common
  // case) don't pay for a parse attempt that's guaranteed to throw.
  const parsed = typeof value === 'string' ? tryParseJson(value) : value;
  if (typeof parsed !== 'object' || parsed === null) {
    return <pre className="GenAITab--pre">{String(parsed)}</pre>;
  }
  const isSmall = Object.keys(parsed).length <= 10;
  return (
    <div className="GenAITab--json">
      <JsonView
        data={parsed}
        shouldExpandNode={isSmall ? allExpanded : collapseAllNested}
        style={jsonViewStyles}
      />
    </div>
  );
}

export default function GenAITab({ span }: Props): React.ReactElement {
  const data = useMemo(() => extractGenAiData(span.attributes), [span.attributes]);
  const {
    provider,
    model,
    usage,
    inputMessages,
    outputMessages,
    systemInstructions,
    toolCall,
    otherAttributes,
  } = data;
  const [isOtherOpen, setIsOtherOpen] = useState(false);

  const showTokens = hasAnyTokenUsage(usage);
  const showConversation =
    inputMessages.length > 0 || outputMessages.length > 0 || Boolean(systemInstructions);
  const hasContent =
    showTokens ||
    showConversation ||
    Boolean(toolCall) ||
    Boolean(provider) ||
    Boolean(model) ||
    otherAttributes.length > 0;

  return (
    <div className="GenAITab">
      {(provider || model) && (
        <div className="GenAITab--meta">
          {provider && (
            <span className="GenAITab--metaItem">
              <span className="GenAITab--metaLabel">Provider</span> {provider}
            </span>
          )}
          {model && (
            <span className="GenAITab--metaItem">
              <span className="GenAITab--metaLabel">Model</span> {model}
            </span>
          )}
        </div>
      )}

      {showTokens && (
        <div className="GenAITab--tokens">
          {usage.inputTokens != null && (
            <span className="GenAITab--tokenItem">
              <span className="GenAITab--tokenLabel">Input</span> {formatTokenCount(usage.inputTokens)}
            </span>
          )}
          {usage.outputTokens != null && (
            <span className="GenAITab--tokenItem">
              <span className="GenAITab--tokenLabel">Output</span> {formatTokenCount(usage.outputTokens)}
            </span>
          )}
          {usage.cacheReadInputTokens != null && (
            <span className="GenAITab--tokenItem">
              <span className="GenAITab--tokenLabel">Cached (read)</span>{' '}
              {formatTokenCount(usage.cacheReadInputTokens)}
            </span>
          )}
          {usage.cacheCreationInputTokens != null && (
            <span className="GenAITab--tokenItem">
              <span className="GenAITab--tokenLabel">Cached (write)</span>{' '}
              {formatTokenCount(usage.cacheCreationInputTokens)}
            </span>
          )}
          {usage.reasoningOutputTokens != null && (
            <span className="GenAITab--tokenItem">
              <span className="GenAITab--tokenLabel">Reasoning</span>{' '}
              {formatTokenCount(usage.reasoningOutputTokens)}
            </span>
          )}
        </div>
      )}

      {showConversation && (
        <div className="GenAITab--section">
          <h3 className="GenAITab--sectionTitle">Conversation</h3>
          {systemInstructions && (
            <MessageBlock message={{ role: 'system', content: systemInstructions }} index={-1} />
          )}
          {inputMessages.map((message, i) => (
            <MessageBlock key={`input-${i}`} message={message} index={i} />
          ))}
          {outputMessages.map((message, i) => (
            <MessageBlock
              key={`output-${i}`}
              message={{ role: message.role || 'assistant', content: message.content }}
              index={inputMessages.length + i}
            />
          ))}
        </div>
      )}

      {toolCall && (
        <div className="GenAITab--section">
          <h3 className="GenAITab--sectionTitle">Tool Call{toolCall.name ? `: ${toolCall.name}` : ''}</h3>
          {toolCall.arguments !== undefined && (
            <div className="GenAITab--toolSubsection">
              <span className="GenAITab--toolLabel">Arguments</span>
              <JsonBlock value={toolCall.arguments} />
            </div>
          )}
          {toolCall.result !== undefined && (
            <div className="GenAITab--toolSubsection">
              <span className="GenAITab--toolLabel">Result</span>
              <JsonBlock value={toolCall.result} />
            </div>
          )}
        </div>
      )}

      {otherAttributes.length > 0 && (
        <AccordionAttributes
          className="GenAITab--otherAttributes"
          data={otherAttributes}
          label="Other GenAI Attributes"
          linksGetter={null}
          isOpen={isOtherOpen}
          onToggle={() => setIsOtherOpen(o => !o)}
        />
      )}

      {!hasContent && <div className="GenAITab--empty">No GenAI-specific attributes found on this span.</div>}
    </div>
  );
}
