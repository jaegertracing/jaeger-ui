// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import { Input } from 'antd';
import * as React from 'react';

import { normalizeTraceId } from '../../../utils/normalize';

type Props = {
  selectTrace: (traceID: string) => void;
};

const { Search } = Input;

export default function TraceIdInput(props: Props) {
  const { selectTrace } = props;
  const handleSearch = React.useCallback(
    (value: string) => {
      selectTrace(normalizeTraceId(value));
    },
    [selectTrace]
  );
  return <Search addonBefore="Select by Trace ID" enterButton onSearch={handleSearch} />;
}
