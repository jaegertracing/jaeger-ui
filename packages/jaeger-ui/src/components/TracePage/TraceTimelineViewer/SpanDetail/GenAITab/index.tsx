// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React, { useMemo, useState } from 'react';
import Markdown from 'markdown-to-jsx/react';
import { JsonView, allExpanded, collapseAllNested } from 'react-json-view-lite';

import {
  extractGenAiSections,
  formatTokenCount,
  tryParseJson,
  GenAiMessage,
  GenAiTokenUsage,
  GenAiToolCall,
} from './genAiData';
import {
  MessageFormat,
  MARKDOWN_SIZE_LIMIT,
  readStoredMessageFormat,
  writeStoredMessageFormat,
  detectDefaultMessageFormat,
} from './messageFormat';
import AccordionAttributes from '../AccordionAttributes';
import { sharedMarkdownOptions } from '../../../../../utils/markdownOptions';
import jsonViewStyles from '../../../../../utils/jsonViewStyles';
import CopyIcon from '../../../../common/CopyIcon';
import type { IOtelSpan } from '../../../../../types/otel';

import './index.css';

type Props = { span: IOtelSpan };

// markdown-to-jsx only wraps its output in a block element (a <div>) once it has more
// than one top-level child; a single short sentence with no other formatting compiles
// to one inline node, which forceWrapper (see sharedMarkdownOptions) then wraps in a
// bare <span> instead - and padding/margin on an inline element only shows at the very
// start/end of the whole run, not around each wrapped line, so a one-paragraph message
// renders with an indented first line and no padding on the rest. forceBlock makes the
// compiler always parse content as a block (a <p>), which forceWrapper then always
// wraps in a real <div>, giving every message the same block box our CSS assumes.
const genAiMarkdownOptions = { ...sharedMarkdownOptions, forceBlock: true };

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

function MessageBlock({
  message,
  format,
  onFormatChange,
  messageNumber,
}: {
  message: GenAiMessage;
  format: MessageFormat;
  onFormatChange: (format: MessageFormat) => void;
  messageNumber: number;
}) {
  const isOversized = message.content.length > MARKDOWN_SIZE_LIMIT;
  // Parsed once and reused both for the JSON option's disabled state and for the
  // JSON render branch below, instead of parsing the same string twice.
  const parsedJson = tryParseJson(message.content);
  const isValidJson = typeof parsedJson === 'object' && parsedJson !== null;
  const effectiveFormat: MessageFormat =
    (format === 'markdown' && isOversized) || (format === 'json' && !isValidJson) ? 'plain' : format;

  return (
    <div className={`GenAITab--message GenAITab--message-${message.role || 'unknown'}`}>
      <div className="GenAITab--messageHeader">
        <span className="GenAITab--messageRole">{message.role || 'message'}</span>
        <div className="GenAITab--messageHeaderActions">
          <select
            className="GenAITab--formatSelect"
            aria-label={`Content format for message ${messageNumber} (${message.role || 'message'})`}
            value={effectiveFormat}
            onChange={e => onFormatChange(e.target.value as MessageFormat)}
          >
            <option value="plain">Plain</option>
            <option
              value="markdown"
              disabled={isOversized}
              title={isOversized ? 'Markdown is disabled for messages over 150KB' : undefined}
            >
              Markdown{isOversized ? ' (too large)' : ''}
            </option>
            <option
              value="json"
              disabled={!isValidJson}
              title={!isValidJson ? 'JSON is disabled - this content is not valid JSON' : undefined}
            >
              JSON{!isValidJson ? ' (not JSON)' : ''}
            </option>
          </select>
          <CopyIcon copyText={message.content} tooltipTitle="Copy message" buttonText="Copy" />
        </div>
      </div>
      {effectiveFormat === 'json' ? (
        <JsonBlock value={parsedJson} />
      ) : effectiveFormat === 'markdown' ? (
        <Markdown className="GenAITab--messageContent" options={genAiMarkdownOptions}>
          {message.content}
        </Markdown>
      ) : (
        <pre className="GenAITab--messageContent GenAITab--messageContent-plain">{message.content}</pre>
      )}
    </div>
  );
}

function MetaRow({ provider, model }: { provider?: string; model?: string }) {
  return (
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
  );
}

// Cosmetic only - a key missing from here still renders, just under its raw
// field name instead of a friendly label, so a future token-usage field
// shows up automatically without needing a matching entry added here.
const TOKEN_LABELS: Partial<Record<keyof GenAiTokenUsage, string>> = {
  inputTokens: 'Input',
  outputTokens: 'Output',
  cacheReadInputTokens: 'Cached (read)',
  cacheCreationInputTokens: 'Cached (write)',
  reasoningOutputTokens: 'Reasoning',
};

function TokensRow({ usage }: { usage: GenAiTokenUsage }) {
  return (
    <div className="GenAITab--tokens">
      <span className="GenAITab--tokensPrefix">Tokens:</span>
      {(Object.keys(usage) as Array<keyof GenAiTokenUsage>).map(key => {
        const value = usage[key];
        if (value == null) return null;
        return (
          <span key={key} className="GenAITab--tokenItem">
            <span className="GenAITab--tokenLabel">{TOKEN_LABELS[key] ?? key}</span> {formatTokenCount(value)}
          </span>
        );
      })}
    </div>
  );
}

function ConversationSection({
  systemInstructions,
  inputMessages,
  outputMessages,
}: {
  systemInstructions?: string;
  inputMessages: GenAiMessage[];
  outputMessages: GenAiMessage[];
}) {
  // In-memory overrides live here (ConversationSection), not in each MessageBlock
  // instance: a format choice for an attribute name must apply to every
  // currently-rendered message from that attribute immediately, not just on that one
  // message's own instance or a future remount.
  const [overrides, setOverrides] = useState<Partial<Record<string, MessageFormat>>>({});

  const getFormat = (attributeKey: string, content: string): MessageFormat =>
    overrides[attributeKey] ?? readStoredMessageFormat(attributeKey) ?? detectDefaultMessageFormat(content);

  const setFormat = (attributeKey: string, format: MessageFormat) => {
    writeStoredMessageFormat(attributeKey, format);
    setOverrides(prev => ({ ...prev, [attributeKey]: format }));
  };

  // Flattened into one ordered list (rather than three separate blocks) so each
  // message can get a stable, unique position number for its format dropdown's
  // accessible name - with per-role select elements otherwise indistinguishable
  // to a screen reader when a conversation has multiple messages. Built via push
  // rather than spread so each pushed object literal stays contextually typed
  // against GenAiMessage's role union, instead of widening to a plain string.
  const messages: Array<{ key: string; message: GenAiMessage; attributeKey: string }> = [];
  if (systemInstructions) {
    messages.push({
      key: 'system',
      message: { role: 'system', content: systemInstructions },
      attributeKey: 'gen_ai.system_instructions',
    });
  }
  inputMessages.forEach((message, i) => {
    messages.push({ key: `input-${i}`, message, attributeKey: 'gen_ai.input.messages' });
  });
  outputMessages.forEach((message, i) => {
    messages.push({
      key: `output-${i}`,
      message: { role: message.role || 'assistant', content: message.content },
      attributeKey: 'gen_ai.output.messages',
    });
  });

  return (
    <div className="GenAITab--section">
      <h3 className="GenAITab--sectionTitle">Conversation</h3>
      {messages.map(({ key, message, attributeKey }, i) => (
        <MessageBlock
          key={key}
          message={message}
          format={getFormat(attributeKey, message.content)}
          onFormatChange={f => setFormat(attributeKey, f)}
          messageNumber={i + 1}
        />
      ))}
    </div>
  );
}

function ToolCallSection({ id, name, arguments: args, result }: GenAiToolCall) {
  return (
    <div className="GenAITab--section">
      <h3 className="GenAITab--sectionTitle">Tool Call{name && `: ${name}`}</h3>
      {id && (
        <div className="GenAITab--toolSubsection">
          <span className="GenAITab--toolLabel">ID</span> {id}
        </div>
      )}
      {args !== undefined && (
        <div className="GenAITab--toolSubsection">
          <span className="GenAITab--toolLabel">Arguments</span>
          <JsonBlock value={args} />
        </div>
      )}
      {result !== undefined && (
        <div className="GenAITab--toolSubsection">
          <span className="GenAITab--toolLabel">Result</span>
          <JsonBlock value={result} />
        </div>
      )}
    </div>
  );
}

// The set of GenAiSection types is closed and authored in this same module,
// so this is dead code today - every variant extractGenAiSections can
// currently produce has an explicit case above it. It costs nothing while the
// switch stays exhaustive, and only ever runs if that invariant is broken (a
// future section type added to the registry without a matching case here).
// Per the no-data-hiding principle, an ugly-but-honest key/value dump beats
// silently rendering nothing.
function UnknownSection({ type, data }: { type: string; data: Record<string, unknown> }) {
  return (
    <div className="GenAITab--section">
      <h3 className="GenAITab--sectionTitle">{type}</h3>
      {Object.entries(data).map(([key, value]) => (
        <div key={key} className="GenAITab--toolSubsection">
          <span className="GenAITab--toolLabel">{key}</span>
          <JsonBlock value={value} />
        </div>
      ))}
    </div>
  );
}

export default function GenAITab({ span }: Props): React.ReactElement {
  const sections = useMemo(() => extractGenAiSections(span.attributes), [span.attributes]);
  const [isOtherOpen, setIsOtherOpen] = useState(false);

  if (sections.length === 0) {
    return <div className="GenAITab--empty">No GenAI-specific attributes found on this span.</div>;
  }

  return (
    <div className="GenAITab">
      {sections.map(section => {
        switch (section.type) {
          case 'meta':
            return <MetaRow key="meta" {...section.data} />;
          case 'tokens':
            return <TokensRow key="tokens" usage={section.data} />;
          case 'conversation':
            return <ConversationSection key="conversation" {...section.data} />;
          case 'toolCall':
            return <ToolCallSection key="toolCall" {...section.data} />;
          case 'other':
            return (
              <AccordionAttributes
                key="other"
                className="GenAITab--otherAttributes"
                data={section.data.attributes}
                label="Other GenAI Attributes"
                linksGetter={null}
                isOpen={isOtherOpen}
                onToggle={() => setIsOtherOpen(o => !o)}
              />
            );
          default:
            return (
              <UnknownSection
                key={(section as { type: string }).type}
                type={(section as { type: string }).type}
                data={(section as { data: Record<string, unknown> }).data}
              />
            );
        }
      })}
    </div>
  );
}
