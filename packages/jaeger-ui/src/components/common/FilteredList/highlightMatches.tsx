// Copyright (c) 2019 Uber Technologies, Inc.
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
import memoize from 'lru-memoize';

enum EHighlightCadence {
  Even = 0,
  Odd = 1,
}

const ANY_LAZY = '(.*?)';
const ANY_GREEDY = '(.*)';

function wordBreak(lowerLetter: string) {
  return `(\\b${lowerLetter}|${lowerLetter.toUpperCase()})`;
}

function letterClass(lowerLetter: string) {
  return `[${lowerLetter}${lowerLetter.toUpperCase()}]`;
}

function toHighlights(cadence: EHighlightCadence, match: RegExpMatchArray) {
  const texts = match
    .map((tx: string, i: number) => {
      if (i === 0 || !tx) {
        // the first group is the full match, not a capturing group
        return null;
      }
      if (i % 2 !== cadence) {
        return tx;
      }
      return <mark key={`${tx + i}`}>{tx}</mark>;
    })
    .filter(Boolean);
  return <span>{texts}</span>;
}

/**
 * Create regular expressions used for highlighting matches between the query
 * and the text. This is derived from the match-sorter ranking system description:
 * https://github.com/kentcdodds/match-sorter#this-solution
 *
 * Several regular expressions are created from the filterText. These roughly
 * align with the ranking system described in the link. They are used to divide
 * input text into emphasized and non-emphasized sections.
 */
class MatchHighlighter {
  public static make(query: string) {
    return new MatchHighlighter(query);
  }

  private readonly matchers: [RegExp, EHighlightCadence][];

  constructor(readonly query: string) {
    // istanbul ignore next
    if (!query) {
      this.matchers = [];
      return;
    }
    const tx = query.toLowerCase();
    const initialCap = `${tx[0].toUpperCase()}${tx.slice(1)}`;
    const letters = tx.split('');
    const startsWith = `^(${tx})`;
    const wordStartsWith = `(\\b${letters.map(letterClass).join('')}|${initialCap})`;
    const acronymLetters = letters.map(letter => wordBreak(letter)).join(ANY_LAZY);
    const constains = `(${tx})`;
    const anyLetters = letters.map(letter => `(${letter})`).join(ANY_LAZY);

    // given the query "eg", the following regular expressions will be created:
    this.matchers = [
      // case-insensitive match at start of text, would match "ego" but not "lego"
      // /^(eg)(.*)/i
      [new RegExp(`${startsWith}${ANY_GREEDY}`, 'i'), EHighlightCadence.Odd],

      // case-insensitive match at start of word, with boundaries in camelCase counting as words
      // would match "theEgg" and "the-egg"
      // /(.*?)(\b[eE][gG]|Eg)(.*)/
      [new RegExp(`${ANY_LAZY}${wordStartsWith}${ANY_GREEDY}`), EHighlightCadence.Even],

      // match an acronym, e.g. "easy-going" and "easyGoing" would both match "eg"
      // /(.*?)(\be|E)(.*?)(\bg|G)(.*)/
      [new RegExp(`${ANY_LAZY}${acronymLetters}${ANY_GREEDY}`), EHighlightCadence.Even],

      // case insensitive contains
      // /(.*?)(eg)(.*)/i
      [new RegExp(`${ANY_LAZY}${constains}${ANY_GREEDY}`, 'i'), EHighlightCadence.Even],

      // contains each letter, in sequence
      // /(.*?)(e)(.*?)(g)(.*)/i
      [new RegExp(`${ANY_LAZY}${anyLetters}${ANY_GREEDY}`, 'i'), EHighlightCadence.Even],
    ];
  }

  highlightMatches(text: string) {
    if (!text) {
      return text;
    }
    for (let i = 0; i < this.matchers.length; i++) {
      const [matcher, cadence] = this.matchers[i];
      const match = text.match(matcher);
      if (!match) {
        continue;
      }
      return toHighlights(cadence, match);
    }
    return text;
  }
}

const getHighlighter = memoize(30)(MatchHighlighter.make);

function highlightMatchesImpl(query: string, text: string) {
  if (!query) {
    return text;
  }
  return getHighlighter(query).highlightMatches(text);
}

export default memoize(200)(highlightMatchesImpl);
