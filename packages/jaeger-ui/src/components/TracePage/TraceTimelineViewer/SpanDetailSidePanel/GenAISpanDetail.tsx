// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React, { useState } from 'react';
import type { GenAISpanKind } from '../../../../utils/gen-ai';
import {
  DB_COLLECTION_NAME,
  GEN_AI_COMPLETION,
  GEN_AI_OPERATION_NAME,
  GEN_AI_PROMPT,
  GEN_AI_REQUEST_MODEL,
  GEN_AI_SYSTEM,
  GEN_AI_TOOL_CALL_ID,
  GEN_AI_TOOL_INPUT,
  GEN_AI_TOOL_NAME,
  GEN_AI_TOOL_OUTPUT,
  GEN_AI_USAGE_INPUT_TOKENS,
  GEN_AI_USAGE_OUTPUT_TOKENS,
  getAttr,
  getAttrsByPrefix,
  isMediaUrl,
} from '../../../../utils/gen-ai';
import type { IOtelSpan } from '../../../../types/otel';

import './GenAISpanDetail.css';

const DISPLAY_LIMIT = 4096;

type GenAISpanDetailProps = {
  span: IOtelSpan;
  kind: GenAISpanKind;
  useOtelTerms: boolean;
};

function isSafeMediaUrl(value: string): boolean {
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

function TextBlock({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const [mediaLoaded, setMediaLoaded] = useState(false);
  const truncated = !expanded && text.length > DISPLAY_LIMIT;
  const displayed = truncated ? text.slice(0, DISPLAY_LIMIT) : text;

  const mediaKind = isMediaUrl(text);
  if (mediaKind && !mediaLoaded) {
    const safe = isSafeMediaUrl(text);
    return (
      <div className="GenAISpanDetail--mediaGate">
        <code className="GenAISpanDetail--mediaUrl">{text}</code>
        <button
          type="button"
          className="GenAISpanDetail--loadMedia"
          onClick={() => safe && setMediaLoaded(true)}
          disabled={!safe}
        >
          {safe ? `Load ${mediaKind}` : 'Blocked — only https:// URLs can be loaded'}
        </button>
      </div>
    );
  }
  if (mediaKind === 'image' && mediaLoaded) {
    return <img src={text} alt="span media" className="GenAISpanDetail--media" />;
  }
  if (mediaKind === 'audio' && mediaLoaded) {
    // eslint-disable-next-line jsx-a11y/media-has-caption
    return <audio controls src={text} className="GenAISpanDetail--media" />;
  }

  return (
    <>
      {/* TODO: replace <pre> with a proper Markdown renderer (e.g. react-markdown) once
          the maintainer has approved the dependency in the PR. See #8401 requirement 3. */}
      <pre className="GenAISpanDetail--pre">{displayed}</pre>
      {truncated && (
        <button type="button" className="GenAISpanDetail--showMore" onClick={() => setExpanded(true)}>
          Show more ({Math.ceil((text.length - DISPLAY_LIMIT) / 1024)} KB hidden)
        </button>
      )}
    </>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="GenAISpanDetail--section">
      <div className="GenAISpanDetail--sectionLabel">{label}</div>
      {children}
    </div>
  );
}

function LLMDetail({ span }: { span: IOtelSpan }) {
  const model = getAttr(span, GEN_AI_REQUEST_MODEL);
  const system = getAttr(span, GEN_AI_SYSTEM);
  const operation = getAttr(span, GEN_AI_OPERATION_NAME);
  const inputTokens = getAttr(span, GEN_AI_USAGE_INPUT_TOKENS);
  const outputTokens = getAttr(span, GEN_AI_USAGE_OUTPUT_TOKENS);
  const prompt = getAttr(span, GEN_AI_PROMPT);
  const completion = getAttr(span, GEN_AI_COMPLETION);

  return (
    <>
      <div className="GenAISpanDetail--header">
        <div className="GenAISpanDetail--title">{String(model ?? span.name)}</div>
        <div className="GenAISpanDetail--meta">
          {system && <span>{String(system)}</span>}
          {system && operation && ' · '}
          {operation && <span>{String(operation)}</span>}
        </div>
      </div>

      {(inputTokens !== undefined || outputTokens !== undefined) && (
        <Section label="Token Usage">
          <div className="GenAISpanDetail--tokenRow">
            {inputTokens !== undefined && (
              <div className="GenAISpanDetail--tokenStat">
                <span className="GenAISpanDetail--tokenValue">{String(inputTokens)}</span>
                <span className="GenAISpanDetail--tokenLabel">input</span>
              </div>
            )}
            {outputTokens !== undefined && (
              <div className="GenAISpanDetail--tokenStat">
                <span className="GenAISpanDetail--tokenValue">{String(outputTokens)}</span>
                <span className="GenAISpanDetail--tokenLabel">output</span>
              </div>
            )}
          </div>
        </Section>
      )}

      {prompt !== undefined && (
        <Section label="Prompt">
          <TextBlock text={String(prompt)} />
        </Section>
      )}

      {completion !== undefined && (
        <Section label="Completion">
          <TextBlock text={String(completion)} />
        </Section>
      )}
    </>
  );
}

function ToolDetail({ span }: { span: IOtelSpan }) {
  const toolName = getAttr(span, GEN_AI_TOOL_NAME);
  const callId = getAttr(span, GEN_AI_TOOL_CALL_ID);
  const inputAttr = getAttr(span, GEN_AI_TOOL_INPUT);
  const outputAttr = getAttr(span, GEN_AI_TOOL_OUTPUT);

  function prettyJSON(value: unknown): string {
    try {
      const parsed = typeof value === 'string' ? JSON.parse(value) : value;
      return JSON.stringify(parsed, null, 2);
    } catch {
      return String(value);
    }
  }

  return (
    <>
      <div className="GenAISpanDetail--header">
        <div className="GenAISpanDetail--title">{String(toolName ?? span.name)}</div>
        {callId !== undefined && <div className="GenAISpanDetail--meta">call id: {String(callId)}</div>}
      </div>

      {inputAttr !== undefined && (
        <Section label="Input">
          <pre className="GenAISpanDetail--pre">{prettyJSON(inputAttr)}</pre>
        </Section>
      )}

      {outputAttr !== undefined && (
        <Section label="Output">
          <pre className="GenAISpanDetail--pre">{prettyJSON(outputAttr)}</pre>
        </Section>
      )}
    </>
  );
}

function RetrievalDetail({ span }: { span: IOtelSpan }) {
  const collection = getAttr(span, DB_COLLECTION_NAME);
  const query = getAttr(span, 'rag.query');
  const count = getAttr(span, 'rag.results_count');

  return (
    <>
      <div className="GenAISpanDetail--header">
        <div className="GenAISpanDetail--title">{String(collection ?? span.name)}</div>
        {query !== undefined && <div className="GenAISpanDetail--meta">{String(query)}</div>}
      </div>

      {count !== undefined && (
        <Section label="Results">
          <span className="GenAISpanDetail--tokenValue">{String(count)}</span>
        </Section>
      )}
    </>
  );
}

function AgentDetail({ span }: { span: IOtelSpan }) {
  const episodeId = getAttr(span, 'agent.episode_id');
  const step = getAttr(span, 'agent.step');
  const score = getAttr(span, 'agent.reasoning_score');
  const extraAttrs = getAttrsByPrefix(span, 'agent.').filter(
    a => a.key !== 'agent.episode_id' && a.key !== 'agent.step' && a.key !== 'agent.reasoning_score'
  );

  return (
    <>
      <div className="GenAISpanDetail--header">
        <div className="GenAISpanDetail--title">{String(episodeId ?? span.name)}</div>
        {step !== undefined && <div className="GenAISpanDetail--meta">step {String(step)}</div>}
      </div>

      {score !== undefined && (
        <Section label="Reasoning Score">
          <span className="GenAISpanDetail--scoreBadge">{String(score)}</span>
        </Section>
      )}

      {extraAttrs.length > 0 && (
        <Section label="Agent Attributes">
          <table className="GenAISpanDetail--attrTable">
            <tbody>
              {extraAttrs.map(a => (
                <tr key={a.key}>
                  <td>{a.key}</td>
                  <td>{String(a.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      )}
    </>
  );
}

export default function GenAISpanDetail({ span, kind }: GenAISpanDetailProps) {
  return (
    <div className="GenAISpanDetail">
      {kind === 'llm' && <LLMDetail span={span} />}
      {kind === 'tool' && <ToolDetail span={span} />}
      {kind === 'retrieval' && <RetrievalDetail span={span} />}
      {kind === 'agent' && <AgentDetail span={span} />}
    </div>
  );
}
