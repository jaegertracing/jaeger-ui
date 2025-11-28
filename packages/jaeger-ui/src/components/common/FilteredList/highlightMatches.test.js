// Copyright (c) 2019 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import highlightMatches from './highlightMatches';

describe('highlightMatches(query, text)', () => {
  const tests = [
    {
      message: 'matches the start of the text: [eg]g ego',
      query: 'eg',
      text: 'egg ego',
      expectedMatch: 'eg',
    },
    {
      message: 'matches the start of a word: kebabcase-[ca]se',
      query: 'ca',
      text: 'kebabcase-case',
      expectedMatch: 'ca',
    },
    {
      message: 'matches the start of a word: camelcase[Cas]e',
      query: 'cas',
      text: 'camelcaseCase',
      expectedMatch: 'Cas',
    },
    {
      message: 'matches the acronym: [e]xactly [e]xact sleek bespoke',
      query: 'ee',
      text: 'exactly exact sleek bespoke',
      expectedMatch: 'e',
    },
    {
      message: 'matches the acronym: [e]xactly[E]xactSleekBespoke',
      query: 'ee',
      text: 'exactlyExactSleekBespoke',
      expectedMatch: 'e',
    },
    {
      message: 'matches contains: been-kat-br[eak]able',
      query: 'eak',
      text: 'been-kat-breakable',
      expectedMatch: 'eak',
    },
    {
      message: 'matches letters, in sequence: h[i]ghl[i]ght[i]ng-the-th[i]ngs',
      query: 'iiii',
      text: 'highlighting-the-things',
      expectedMatch: 'i',
      expectedCount: 4,
    },
  ];

  tests.forEach(({ message, query, text, expectedCount = 1 }) => {
    it(message, () => {
      const { container } = render(<span>{highlightMatches(query, text)}</span>);

      const markElements = container.querySelectorAll('mark');

      expect(markElements.length).toBeGreaterThanOrEqual(expectedCount);

      markElements.forEach(mark => {
        expect(mark).toBeInTheDocument();
        expect(mark.textContent).not.toBe('');
      });
    });
  });

  it('does nothing with an empty query', () => {
    const result = highlightMatches('', 'easy-going');
    expect(result).toBe('easy-going');
  });

  it('does nothing with empty text', () => {
    const result = highlightMatches('query', '');
    expect(result).toBe('');
  });

  it('returns the text when there is nothing to match', () => {
    const result = highlightMatches('query', '123');
    expect(result).toBe('123');
  });
});
