// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import { Form, Input } from 'antd';
import { IoSearch, IoSparkles } from 'react-icons/io5';
import { useNavigate } from 'react-router-dom';

import { getUrl } from '../TracePage/url';
import { useJaegerAssistantOptional } from './JaegerAssistantContext';
import { useJaegerAssistantConfigured } from '../../hooks/useJaegerAssistant';
import { looksLikeTraceId } from '../../utils/trace-id';

import './JaegerAskSearchInput.css';

const TRACE_LOOKUP_PLACEHOLDER = 'Lookup by Trace ID...';
const ASK_JAEGER_PLACEHOLDER = 'Ask Jaeger or lookup trace';

function TraceLookupSearchInput() {
  const navigate = useNavigate();
  const goToTrace = React.useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const form = event.currentTarget;
      const value = (form.elements.namedItem('idInput') as HTMLInputElement)?.value;
      if (value) {
        navigate(getUrl(value));
      }
    },
    [navigate]
  );

  return (
    <Form
      data-testid="TraceIDSearchInput--form"
      layout="horizontal"
      onSubmitCapture={goToTrace}
      className="TraceIDSearchInput--form"
    >
      <Input
        className="TraceIDSearchInput--input"
        data-testid="idInput"
        name="idInput"
        placeholder={TRACE_LOOKUP_PLACEHOLDER}
        prefix={<IoSearch />}
        allowClear
      />
    </Form>
  );
}

// Toggle button for the Ask Jaeger side panel
export const JaegerAssistantToggle: React.FC = () => {
  const assistant = useJaegerAssistantOptional();
  const assistantConfigured = useJaegerAssistantConfigured();
  if (!assistant || !assistantConfigured) return null;

  const { panelOpen, setPanelOpen } = assistant;
  return (
    <button
      type="button"
      className={`JaegerAssistantToggle--btn${panelOpen ? ' JaegerAssistantToggle--btn--active' : ''}`}
      onClick={() => setPanelOpen(o => !o)}
      aria-label={panelOpen ? 'Close assistant panel' : 'Open assistant panel'}
      aria-pressed={panelOpen}
      data-testid="JaegerAssistantToggle--btn"
    >
      <IoSparkles size={15} />
    </button>
  );
};

const JaegerAskAssistantSearchInput: React.FC = () => {
  const navigate = useNavigate();
  const assistant = useJaegerAssistantOptional();

  const [value, setValue] = React.useState('');
  const [expanded, setExpanded] = React.useState(false);

  const submit = React.useCallback(() => {
    const raw = value.trim();
    if (!raw) return;

    if (!looksLikeTraceId(raw)) {
      assistant?.requestAskJaeger(raw);
    } else {
      navigate(getUrl(raw));
    }
    setValue('');
    setExpanded(false);
  }, [value, assistant, navigate]);

  const onKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        submit();
      } else if (e.key === 'Escape') {
        setValue('');
        setExpanded(false);
        e.currentTarget.blur();
      }
    },
    [submit]
  );

  return (
    <div
      className={`JaegerAskSearchInput--wrap${expanded ? ' JaegerAskSearchInput--wrap--expanded' : ''}`}
      // Prevent the antd Menu from stealing focus back after a click inside
      onMouseDown={e => e.stopPropagation()}
    >
      <IoSearch className="JaegerAskSearchInput--icon" />
      <textarea
        data-testid="JaegerAskSearchInput--textarea"
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={onKeyDown}
        onFocus={() => setExpanded(true)}
        onBlur={() => setExpanded(false)}
        placeholder={expanded ? '' : ASK_JAEGER_PLACEHOLDER}
        rows={1}
        className="JaegerAskSearchInput--textarea"
        aria-label={ASK_JAEGER_PLACEHOLDER}
        aria-expanded={expanded}
      />
      {expanded && !value && (
        <div className="JaegerAskSearchInput--placeholder" aria-hidden>
          Enter your question,
          <br />
          or paste a Trace ID,
          <br />
          or click the |<IoSparkles size={12} className="JaegerAskSearchInput--placeholder-icon" />| button
          <br />
          for the assistant sidebar
        </div>
      )}
    </div>
  );
};

const JaegerAskSearchInput: React.FC = () => {
  const assistantConfigured = useJaegerAssistantConfigured();
  if (!assistantConfigured) {
    return <TraceLookupSearchInput />;
  }
  return <JaegerAskAssistantSearchInput />;
};

export default React.memo(JaegerAskSearchInput);
