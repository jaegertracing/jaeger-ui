// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import { Form, Input } from 'antd';
import { IoSearch } from 'react-icons/io5';
import { useNavigate } from 'react-router-dom-v5-compat';

import { getUrl } from '../TracePage/url';

import './TraceIDSearchInput.css';

const TraceIDSearchInput: React.FC = () => {
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
        data-testid="idInput"
        name="idInput"
        placeholder="Lookup by Trace ID..."
        prefix={<IoSearch />}
        allowClear
      />
    </Form>
  );
};

export default React.memo(TraceIDSearchInput);
