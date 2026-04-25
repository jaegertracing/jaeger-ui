// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { IoSearch, IoSparkles } from 'react-icons/io5';
import { useNavigate } from 'react-router-dom';

import { getUrl } from '../TracePage/url';
import { useJaegerAssistantOptional } from './JaegerAssistantContext';
import { isJaegerAssistantConfigured } from './jaegerAgUi';

import './JaegerAskSearchInput.css';

/** OpenTelemetry / Jaeger trace ids are often 16- or 32-hex-character strings. */
const TRACE_ID_HEX_RE = /^[0-9a-fA-F]{16,32}$/;

function looksLikeTraceId(value: string): boolean {
  return TRACE_ID_HEX_RE.test(value.trim());
}

// Toggle button for the Ask Jaeger side panel
export const JaegerAssistantToggle: React.FC = () => {
  const assistant = useJaegerAssistantOptional();
  if (!assistant || !isJaegerAssistantConfigured()) return null;

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

const JaegerAskSearchInput: React.FC = () => {
  const navigate = useNavigate();
  const assistant = useJaegerAssistantOptional();

  const [isOpen, setIsOpen] = React.useState(false);
  const [value, setValue] = React.useState('');
  const [floatPos, setFloatPos] = React.useState<{ top: number; right: number } | null>(null);

  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const floatRef = React.useRef<HTMLDivElement>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const openFloat = React.useCallback(() => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setFloatPos({
        top: rect.bottom + 12,
        right: window.innerWidth - rect.right - 16,
      });
    }
    setIsOpen(true);
  }, []);

  // Close when clicking outside both the trigger and the floating panel
  React.useEffect(() => {
    if (!isOpen) return undefined;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!triggerRef.current?.contains(t) && !floatRef.current?.contains(t)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [isOpen]);

  // Move focus into the textarea as soon as the panel opens
  React.useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => textareaRef.current?.focus());
    }
  }, [isOpen]);

  const submit = React.useCallback(() => {
    const raw = value.trim();
    if (!raw) return;

    const assistantOn = isJaegerAssistantConfigured() && assistant;
    if (assistantOn && !looksLikeTraceId(raw)) {
      assistant.requestAskJaeger(raw);
    } else {
      navigate(getUrl(raw.toLowerCase()));
    }
    setValue('');
    setIsOpen(false);
  }, [value, assistant, navigate]);

  const onKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        submit();
      } else if (e.key === 'Escape') {
        setIsOpen(false);
      }
    },
    [submit]
  );

  const placeholder = isJaegerAssistantConfigured()
    ? 'Ask Jaeger or lookup trace ID…'
    : 'Lookup by Trace ID…';

  const floatingPanel =
    isOpen && floatPos ? (
      <div
        ref={floatRef}
        className="JaegerAskSearchInput--float"
        style={{ top: floatPos.top, right: floatPos.right }}
      >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          rows={3}
          className="JaegerAskSearchInput--textarea"
          data-testid="JaegerAskSearchInput--textarea"
        />
      </div>
    ) : null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="JaegerAskSearchInput--trigger"
        onClick={openFloat}
        data-testid="JaegerAskSearchInput--input"
        aria-label={placeholder}
        aria-expanded={isOpen}
      >
        <IoSearch className="JaegerAskSearchInput--triggerIcon" />
        <span className="JaegerAskSearchInput--triggerLabel">{placeholder}</span>
      </button>
      {typeof document !== 'undefined' && ReactDOM.createPortal(floatingPanel, document.body)}
    </>
  );
};

export default React.memo(JaegerAskSearchInput);
