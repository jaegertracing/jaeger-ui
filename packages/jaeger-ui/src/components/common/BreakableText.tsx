// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';

import './BreakableText.css';

const WORD_RX = /\W*\w+\W*/g;

type Props = {
  text: string;
  className?: string;
  wordRegexp?: RegExp;
};

export default function BreakableText({ className = 'BreakableText', text, wordRegexp = WORD_RX }: Props) {
  if (!text) {
    return typeof text === 'string' ? text : null;
  }
  const spans = [];
  wordRegexp.exec('');
  // if the given text has no words, set the first match to the entire text
  let match: RegExpExecArray | string[] | null = wordRegexp.exec(text) || [text];
  while (match) {
    spans.push(
      <span key={`${text}-${spans.length}`} className={className}>
        {match[0]}
      </span>
    );
    match = wordRegexp.exec(text);
  }
  return spans;
}
