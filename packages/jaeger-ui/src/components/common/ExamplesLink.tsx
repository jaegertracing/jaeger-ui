// Copyright (c) 2020 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import { getUrl } from '../SearchTracePage/url';
import NewWindowIcon from './NewWindowIcon';

export type TExample = {
  spanIDs?: string[];
  traceID: string;
};

type TProps = {
  examples?: TExample[];
  includeText?: boolean;
};

type TExampleWithSpans = {
  traceID: string;
  spanIDs: string[];
};

function hasSpans(example: TExample | TExampleWithSpans): example is TExampleWithSpans {
  return Boolean(example.spanIDs && example.spanIDs.length);
}

function getGetUrlArg(examples: TExample[]): { spanLinks: Record<string, string>; traceID: string[] } {
  const spanLinks: Record<string, string> = {};
  const traceID: string[] = [];

  examples.forEach((example: TExample) => {
    if (hasSpans(example)) spanLinks[example.traceID] = example.spanIDs.join(' ');
    else traceID.push(example.traceID);
  });

  return {
    spanLinks,
    traceID,
  };
}

const ExamplesLink: React.FC<TProps> = ({ examples, includeText }) => {
  if (!examples || !examples.length) return null;

  return (
    <a href={getUrl(getGetUrlArg(examples))} target="_blank" rel="noopener noreferrer">
      {includeText && 'Examples '}
      <NewWindowIcon />
    </a>
  );
};

export default ExamplesLink;
