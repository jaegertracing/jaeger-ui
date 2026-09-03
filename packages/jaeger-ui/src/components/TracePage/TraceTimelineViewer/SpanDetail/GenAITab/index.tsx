// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React, { useMemo, useState } from 'react';
import Markdown from 'markdown-to-jsx/react';
import { IoChevronDown, IoChevronForward } from 'react-icons/io5';
import { JsonView, allExpanded, collapseAllNested } from 'react-json-view-lite';

import {
  extractGenAiSections,
  formatTokenCount,
  tryParseJson,
  GenAiAgent,
  GenAiMessage,
  GenAiTokenUsage,
  GenAiToolCall,
} from './genAiData';
import { MessageFormat, useMessageFormatStore } from './message-format-store';
import AccordionAttributes from '../AccordionAttributes';
import { sharedMarkdownOptions } from '../../../../../utils/markdownOptions';
import jsonViewStyles from '../../../../../utils/jsonViewStyles';
import CopyIcon from '../../../../common/CopyIcon';
import { makeAttributes } from '../../../../../model/attributes';
import type { AttributeValue, IAttribute, IOtelSpan } from '../../../../../types/otel';

import './index.css';

type Props = { span: IOtelSpan };

// Above this length the Markdown view asks before parsing - avoids pathological
// reflow/parse cost on huge attributes. Plain text and the JSON tree view have no such
// cap since neither does Markdown's block-level reparsing.
const MARKDOWN_SIZE_LIMIT = 150_000;

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

/**
 * Stands in for content a view will not render until asked, saying why and offering the
 * way forward.
 *
 * A view withholds content when rendering it costs something the reader has not agreed
 * to pay - parse time for a huge message, a request to a third-party host for a remote
 * link. Withholding it silently, or disabling the view outright, leaves the reader with
 * no way to get at their own data, so every such view says what it is holding back and
 * offers both the render and the plain text.
 *
 * Every caller words it the same way - what the content appears to be, then Show <view>
 * beside Show text - so the reader learns one shape rather than one per view.
 *
 * With no onReveal there is nothing left to try, and the plain text is the only way on.
 */
function RevealPrompt({
  notice,
  actionLabel,
  onReveal,
  onShowText,
}: {
  notice: string;
  actionLabel?: string;
  onReveal?: () => void;
  onShowText: () => void;
}) {
  return (
    <div className="GenAITab--revealBlock">
      <span className="GenAITab--revealNotice">{notice}</span>
      <div className="GenAITab--revealActions">
        {onReveal && actionLabel && (
          <button type="button" className="GenAITab--revealButton" onClick={onReveal}>
            {actionLabel}
          </button>
        )}
        <button type="button" className="GenAITab--revealButton" onClick={onShowText}>
          Show text
        </button>
      </div>
    </div>
  );
}

/**
 * A message rendered as Markdown, withheld above MARKDOWN_SIZE_LIMIT.
 *
 * Markdown's block-level reparsing is what makes a huge message expensive, so a message
 * over the limit is not parsed until the reader says to. Offering the render beats
 * disabling the view, which left the formatted text of a large message unreachable.
 *
 * The confirmation lives with the component instance, so content arriving later in the
 * same position is parsed without asking again. That costs one large parse the reader did
 * not explicitly request, and nothing leaves the browser either way.
 */
function MarkdownBlock({ content, onShowText }: { content: string; onShowText: () => void }) {
  const [renderAnyway, setRenderAnyway] = useState(false);

  if (content.length > MARKDOWN_SIZE_LIMIT && !renderAnyway) {
    return (
      <RevealPrompt
        notice={`Content appears to be Markdown (${Math.round(content.length / 1000)}KB).`}
        actionLabel="Show Markdown"
        onReveal={() => setRenderAnyway(true)}
        onShowText={onShowText}
      />
    );
  }

  return (
    <Markdown className="GenAITab--messageContent" options={genAiMarkdownOptions}>
      {content}
    </Markdown>
  );
}

function MessageBlock({
  message,
  formatOverride,
  onFormatChange,
  messageNumber,
}: {
  message: GenAiMessage;
  // Remembered format for this message's attribute, seeding its initial view; null to use
  // the content-derived default.
  formatOverride: MessageFormat | null;
  onFormatChange: (format: MessageFormat) => void;
  messageNumber: number;
}) {
  const parsedJson = useMemo(() => tryParseJson(message.content), [message.content]);
  // This message's own view. The stored preference seeds it at mount and is recorded again
  // whenever the dropdown is used, so the next span opens the way the reader last left it.
  // Choosing a format for one message does not change how the other messages render.
  const [chosenFormat, setChosenFormat] = useState<MessageFormat | null>(formatOverride);
  const [isCollapsed, setIsCollapsed] = useState(false);
  // Each view can only render content it supports; a requested view that can't falls back to plain.
  const canRender: Record<MessageFormat, boolean> = {
    plain: true,
    markdown: true,
    json: parsedJson !== null && typeof parsedJson === 'object',
  };
  // With nothing chosen, JSON-parseable content defaults to the tree view, else plain
  // text (Markdown is only opt-in).
  const requestedFormat: MessageFormat = chosenFormat ?? (canRender.json ? 'json' : 'plain');
  const effectiveFormat: MessageFormat = canRender[requestedFormat] ? requestedFormat : 'plain';

  return (
    <div className={`GenAITab--message GenAITab--message-${message.role || 'unknown'}`}>
      <div className="GenAITab--messageHeader">
        <button
          type="button"
          className="GenAITab--messageToggle"
          aria-expanded={!isCollapsed}
          aria-label={`Message ${messageNumber} (${message.role || 'message'})`}
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          {isCollapsed ? (
            <IoChevronForward className="GenAITab--messageToggleIcon" />
          ) : (
            <IoChevronDown className="GenAITab--messageToggleIcon" />
          )}
          <span className="GenAITab--messageRole">{message.role || 'message'}</span>
        </button>
        <div className="GenAITab--messageHeaderActions">
          <select
            className="GenAITab--formatSelect"
            aria-label={`Content format for message ${messageNumber} (${message.role || 'message'})`}
            value={effectiveFormat}
            onChange={e => {
              const format = e.target.value as MessageFormat;
              setChosenFormat(format);
              onFormatChange(format);
            }}
          >
            <option value="plain">Plain text</option>
            <option value="markdown">Markdown</option>
            <option
              value="json"
              disabled={!canRender.json}
              title={canRender.json ? undefined : 'JSON is disabled - this content is not valid JSON'}
            >
              JSON{canRender.json ? '' : ' (not JSON)'}
            </option>
          </select>
          <CopyIcon copyText={message.content} tooltipTitle="Copy message" buttonText="Copy" />
        </div>
      </div>
      {isCollapsed ? (
        // A folded message still has to be identifiable, so it keeps its first line.
        // The whole value stays in the DOM for browser find-in-page, clipped in CSS.
        <div className="GenAITab--messagePreview">{message.content}</div>
      ) : effectiveFormat === 'json' ? (
        <JsonBlock value={parsedJson} />
      ) : effectiveFormat === 'markdown' ? (
        <MarkdownBlock content={message.content} onShowText={() => setChosenFormat('plain')} />
      ) : (
        <pre className="GenAITab--messageContent GenAITab--messageContent-plain">{message.content}</pre>
      )}
    </div>
  );
}

function LLMDetails({
  provider,
  model,
  isLlmCall,
  isOpen,
  onToggle,
}: {
  provider?: string;
  model?: string;
  isLlmCall: boolean;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const data = useMemo(() => {
    const entries: IAttribute[] = [];
    if (provider) entries.push({ key: 'Provider', value: provider });
    if (model) entries.push({ key: 'Model', value: model });
    return makeAttributes(entries);
  }, [provider, model]);
  return (
    <AccordionAttributes
      className="GenAITab--section"
      // classifySpan() can also resolve to AGENT/TOOL_CALL/RETRIEVAL, which can carry
      // their own backing provider/model per the OTel GenAI semconv - captioning the
      // section "LLM" would misrepresent those as LLM calls, so it's scoped to spans
      // classifySpan() actually identifies as one.
      label={isLlmCall ? 'LLM' : 'Model'}
      data={data}
      linksGetter={null}
      isOpen={isOpen}
      onToggle={onToggle}
    />
  );
}

// Map attribute keys to more reader-friendly labels.
const AGENT_LABELS: Partial<Record<keyof GenAiAgent, string>> = {
  name: 'Name',
  version: 'Version',
  id: 'ID',
  description: 'Description',
};

// name first: AccordionAttributes shows the first entries as a one-line preview when
// collapsed, so leading with name gives high signal without expanding the section.
const AGENT_FIELD_ORDER: ReadonlyArray<keyof GenAiAgent> = ['name', 'id', 'version', 'description'];

function AgentDetails({
  agent,
  isOpen,
  onToggle,
}: {
  agent: GenAiAgent;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const data = useMemo(
    () =>
      makeAttributes(
        AGENT_FIELD_ORDER.filter(key => agent[key] != null).map((key): IAttribute => ({
          key: AGENT_LABELS[key] ?? key,
          value: agent[key] as AttributeValue,
        }))
      ),
    [agent]
  );
  return (
    <AccordionAttributes
      className="GenAITab--section"
      label="Agent"
      data={data}
      linksGetter={null}
      isOpen={isOpen}
      onToggle={onToggle}
    />
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

function TokenDetails({ usage }: { usage: GenAiTokenUsage }) {
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

function ConversationDetails({
  systemInstructions,
  inputMessages,
  outputMessages,
}: {
  systemInstructions?: string;
  inputMessages: GenAiMessage[];
  outputMessages: GenAiMessage[];
}) {
  // The store remembers the last format chosen for each attribute name and seeds every
  // message of that attribute as it mounts; each message owns its view from then on.
  // useMessageFormatStore.overrides already merges in-memory and persisted state, so
  // there's no separate read-then-merge step here.
  const overrides = useMessageFormatStore(state => state.overrides);
  const setFormat = useMessageFormatStore(state => state.setFormat);

  const getFormatOverride = (attributeKey: string): MessageFormat | null => overrides[attributeKey] ?? null;

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
          formatOverride={getFormatOverride(attributeKey)}
          onFormatChange={f => setFormat(attributeKey, f)}
          messageNumber={i + 1}
        />
      ))}
    </div>
  );
}

function ToolCallDetails({
  id,
  name,
  arguments: args,
  result,
  isOpen,
  onToggle,
}: GenAiToolCall & { isOpen: boolean; onToggle: () => void }) {
  const data = useMemo(() => {
    const entries: IAttribute[] = [];
    if (id) entries.push({ key: 'ID', value: id });
    if (args !== undefined) entries.push({ key: 'Arguments', value: args as AttributeValue });
    if (result !== undefined) entries.push({ key: 'Result', value: result as AttributeValue });
    return makeAttributes(entries);
  }, [id, args, result]);
  return (
    <AccordionAttributes
      className="GenAITab--section"
      label={`Tool Call${name ? `: ${name}` : ''}`}
      data={data}
      linksGetter={null}
      isOpen={isOpen}
      onToggle={onToggle}
    />
  );
}

// The set of GenAiSection types is closed and authored in this same module,
// so this is dead code today - every variant extractGenAiSections can
// currently produce has an explicit case above it. It costs nothing while the
// switch stays exhaustive, and only ever runs if that invariant is broken (a
// future section type added to the registry without a matching case here).
// Per the no-data-hiding principle, an ugly-but-honest key/value dump beats
// silently rendering nothing.
function UnknownDetails({
  type,
  data: rawData,
  isOpen,
  onToggle,
}: {
  type: string;
  data: Record<string, unknown>;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const data = useMemo(
    () =>
      makeAttributes(
        Object.entries(rawData).map(([key, value]): IAttribute => ({ key, value: value as AttributeValue }))
      ),
    [rawData]
  );
  return (
    <AccordionAttributes
      className="GenAITab--section"
      label={type}
      data={data}
      linksGetter={null}
      isOpen={isOpen}
      onToggle={onToggle}
    />
  );
}

export default function GenAITab({ span }: Props): React.ReactElement {
  const sections = useMemo(() => extractGenAiSections(span.attributes), [span.attributes]);
  const hasOnlyOtherSection = sections.length === 1 && sections[0].type === 'other';
  // LLM/Agent/Tool Call/Unknown default open since they're primary content for the
  // span, unlike Other GenAI Attributes which is genuinely secondary overflow data.
  const [isLlmOpen, setIsLlmOpen] = useState(true);
  const [isAgentOpen, setIsAgentOpen] = useState(true);
  const [isToolCallOpen, setIsToolCallOpen] = useState(true);
  const [isUnknownOpen, setIsUnknownOpen] = useState(true);
  const [isOtherOpen, setIsOtherOpen] = useState(hasOnlyOtherSection);

  if (sections.length === 0) {
    return <div className="GenAITab--empty">No GenAI-specific attributes found on this span.</div>;
  }

  return (
    <div className="GenAITab">
      {sections.map(section => {
        switch (section.type) {
          case 'agent':
            return (
              <AgentDetails
                key="agent"
                agent={section.data}
                isOpen={isAgentOpen}
                onToggle={() => setIsAgentOpen(o => !o)}
              />
            );
          case 'meta':
            return (
              <LLMDetails
                key="meta"
                {...section.data}
                isLlmCall={span.genAIKind === 'LLM_CALL'}
                isOpen={isLlmOpen}
                onToggle={() => setIsLlmOpen(o => !o)}
              />
            );
          case 'tokens':
            return <TokenDetails key="tokens" usage={section.data} />;
          case 'conversation':
            return <ConversationDetails key="conversation" {...section.data} />;
          case 'toolCall':
            return (
              <ToolCallDetails
                key="toolCall"
                {...section.data}
                isOpen={isToolCallOpen}
                onToggle={() => setIsToolCallOpen(o => !o)}
              />
            );
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
              <UnknownDetails
                key={(section as { type: string }).type}
                type={(section as { type: string }).type}
                data={(section as { data: Record<string, unknown> }).data}
                isOpen={isUnknownOpen}
                onToggle={() => setIsUnknownOpen(o => !o)}
              />
            );
        }
      })}
    </div>
  );
}
