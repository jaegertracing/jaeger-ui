// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import { Input } from 'antd';

type Props = {
  selectTrace: (traceID: string) => void;
};

const { Search } = Input;

export default function TraceIdInput(props: Props) {
  const { selectTrace } = props;
  return <Search addonBefore="Select by Trace ID" enterButton onSearch={selectTrace} />;
}
