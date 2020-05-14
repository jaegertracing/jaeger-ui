// Copyright (c) 2020 Uber Technologies, Inc.
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

export default class ExamplesLink extends React.PureComponent<TProps> {
  render() {
    const { examples, includeText } = this.props;

    if (!examples || !examples.length) return null;

    return (
      <a href={getUrl(getGetUrlArg(examples))} target="_blank" rel="noopener noreferrer">
        {includeText && 'Examples '}
        <NewWindowIcon />
      </a>
    );
  }
}
