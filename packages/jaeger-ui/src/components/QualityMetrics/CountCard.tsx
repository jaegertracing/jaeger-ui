// Copyright (c) 2020 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';

import ExamplesLink, { TExample } from '../common/ExamplesLink';

import './CountCard.css';

export type TProps = {
  count?: number;
  title?: string;
  examples?: TExample[];
};

const CountCard: React.FC<TProps> = ({ count, title, examples }) => {
  if (count === undefined || title === undefined) return null;

  return (
    <div className="CountCard">
      <span className="CountCard--TitleHeader">{title}</span>
      <span className="CountCard--Count">{count}</span>
      <ExamplesLink examples={examples} includeText />
    </div>
  );
};

export default React.memo(CountCard);
