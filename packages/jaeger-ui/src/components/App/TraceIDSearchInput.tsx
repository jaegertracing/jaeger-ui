/* eslint-disable import/no-extraneous-dependencies */
// Copyright (c) 2017 Uber Technologies, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import * as React from 'react';
import { Form, Input } from 'antd';
import { IoSearch } from 'react-icons/io5';

import { History } from 'history';
import { getUrl } from '../TracePage/url';

import './TraceIDSearchInput.css';
import withRouteProps from '../../utils/withRouteProps';

type Props = {
  history: History;
};

const TraceIDSearchInput: React.FC<Props> = ({ history }) => {
  const goToTrace = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const target = event.target as any;
    const value = target.elements.idInput.value;
    if (value) {
      history.push(getUrl(value));
    }
  };

  return (
    <Form
      data-testid="TraceIDSearchInput--form"
      layout="horizontal"
      onSubmitCapture={goToTrace}
      className="TraceIDSearchInput--form"
    >
      <Input data-testid="idInput" name="idInput" placeholder="Lookup by Trace ID..." prefix={<IoSearch />} />
    </Form>
  );
};

export default withRouteProps(TraceIDSearchInput);
