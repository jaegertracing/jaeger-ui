// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import { Form, Input } from 'antd';
import { IoSearch } from 'react-icons/io5';
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

const JaegerAskSearchInput: React.FC = () => {
  const navigate = useNavigate();
  const assistant = useJaegerAssistantOptional();

  const goToTrace = React.useCallback(
    (traceId: string) => {
      navigate(getUrl(traceId.trim().toLowerCase()));
    },
    [navigate]
  );

  const onSubmit = React.useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const form = event.currentTarget;
      const raw = (form.elements.namedItem('jaegerAskInput') as HTMLInputElement)?.value?.trim();
      if (!raw) return;

      const assistantOn = isJaegerAssistantConfigured() && assistant;
      if (assistantOn && !looksLikeTraceId(raw)) {
        assistant.requestAskJaeger(raw);
        return;
      }

      goToTrace(raw);
    },
    [assistant, goToTrace]
  );

  return (
    <Form
      data-testid="JaegerAskSearchInput--form"
      layout="horizontal"
      onSubmitCapture={onSubmit}
      className="JaegerAskSearchInput--form"
    >
      <Input
        className="JaegerAskSearchInput--input"
        data-testid="JaegerAskSearchInput--input"
        name="jaegerAskInput"
        placeholder={isJaegerAssistantConfigured() ? 'Ask Jaeger or lookup trace ID…' : 'Lookup by Trace ID…'}
        prefix={<IoSearch />}
        allowClear
      />
    </Form>
  );
};

export default React.memo(JaegerAskSearchInput);
