// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { defaultStyles } from 'react-json-view-lite';

const jsonViewStyles = {
  ...defaultStyles,
  container: 'json-markup',
  label: 'json-markup-key',
  stringValue: 'json-markup-string',
  numberValue: 'json-markup-number',
  booleanValue: 'json-markup-bool',
  nullValue: 'json-markup-null',
  undefinedValue: 'json-markup-undefined',
  basicChildStyle: 'json-markup-child',
  punctuation: 'json-markup-punctuation',
  collapseIcon: 'json-markup-icon-collapse',
  collapsedContent: 'json-markup-collapse-content',
  expandIcon: 'json-markup-icon-expand',
  otherValue: 'json-markup-other',
};

export default jsonViewStyles;
