// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import type { MarkdownToJSX } from 'markdown-to-jsx';

function SafeLink({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  // Browsers treat URL schemes case-insensitively and tolerate surrounding
  // whitespace, so the allowlist check must normalize before comparing (e.g.
  // "HTTPS://…" or a leading-space href must not be wrongly blocked). The
  // rendered href keeps its original casing -- only the scheme comparison is
  // normalized, since path/query segments can be legitimately case-sensitive.
  const trimmedHref = typeof href === 'string' ? href.trim() : '';
  const lowerHref = trimmedHref.toLowerCase();
  const isSafe =
    !!trimmedHref &&
    (lowerHref.startsWith('http://') || lowerHref.startsWith('https://') || lowerHref.startsWith('mailto:'));
  if (!isSafe) {
    return React.createElement('span', props, children);
  }
  return React.createElement(
    'a',
    { ...props, href: trimmedHref, target: '_blank', rel: 'noopener noreferrer' },
    children
  );
}

function SafeImage({ alt, title }: React.ImgHTMLAttributes<HTMLImageElement>) {
  return React.createElement(
    'span',
    { className: 'JaegerAssistantPanel-image-placeholder' },
    `[Image: ${alt || title || 'unsupported'}]`
  );
}

// Private-use stand-in for `_` inside code spans. optimizeForStreaming counts
// every `_` in the source and deletes the last unpaired one before parsing, so
// a sentinel is the only way to keep `customer_id` inside backticks.
const UNDERSCORE_SENTINEL = '\uE000';

function restoreLiteralUnderscores(text: string): string {
  return text.replaceAll(UNDERSCORE_SENTINEL, '_');
}

function protectUnderscores(code: string): string {
  return code.replaceAll('_', UNDERSCORE_SENTINEL);
}

function findClosingFence(markdown: string, from: number, marker: string): number {
  let i = from;
  while (i < markdown.length) {
    const atLineStart = i === 0 || markdown[i - 1] === '\n';
    if (atLineStart && markdown.startsWith(marker, i)) {
      const next = markdown[i + marker.length];
      if (next === undefined || next === '\n' || next === '\r' || next === ' ') return i;
    }
    i += 1;
  }
  return -1;
}

function maskCodeRegions(markdown: string): string {
  let out = '';
  let i = 0;
  let plainStart = 0;
  const flushPlain = (end: number) => {
    if (end > plainStart) out += markdown.slice(plainStart, end);
  };

  while (i < markdown.length) {
    const atLineStart = i === 0 || markdown[i - 1] === '\n';
    const isFence = atLineStart && (markdown.startsWith('```', i) || markdown.startsWith('~~~', i));
    if (!isFence && markdown[i] !== '`') {
      i += 1;
      continue;
    }

    flushPlain(i);
    if (isFence) {
      const markerChar = markdown[i] ?? '`';
      let markerEnd = i;
      while (markdown[markerEnd] === markerChar) markerEnd += 1;
      const marker = markdown.slice(i, markerEnd);
      const lineEnd = markdown.indexOf('\n', markerEnd);
      const contentStart = lineEnd === -1 ? markdown.length : lineEnd + 1;
      const close = findClosingFence(markdown, contentStart, marker);
      const contentEnd = close === -1 ? markdown.length : close;
      out += markdown.slice(i, contentStart);
      out += protectUnderscores(markdown.slice(contentStart, contentEnd));
      if (close === -1) return out;
      out += markdown.slice(close, close + marker.length);
      i = close + marker.length;
      plainStart = i;
      continue;
    }

    let markerEnd = i;
    while (markdown[markerEnd] === '`') markerEnd += 1;
    const marker = markdown.slice(i, markerEnd);
    const close = markdown.indexOf(marker, markerEnd);
    if (close === -1) {
      // An unclosed backtick is still being streamed. Leave the rest as prose
      // so the sentinel does not leak into the paragraph.
      out += markdown[i] ?? '';
      i += 1;
      plainStart = i;
      continue;
    }
    out += marker;
    out += protectUnderscores(markdown.slice(markerEnd, close));
    out += marker;
    i = close + marker.length;
    plainStart = i;
  }

  flushPlain(markdown.length);
  return out;
}

/**
 * Keep snake_case identifiers literal under `optimizeForStreaming`.
 *
 * markdown-to-jsx treats a leftover `_` as an unfinished emphasis marker and
 * deletes it, including inside inline code. `customer_id` otherwise renders as
 * `customerid`. Intraword underscores become `&#95;` (decoded back to `_` in
 * prose). Underscores inside code spans are masked and restored by the `code`
 * override, because entities would show up literally there.
 */
export function literalizeIdentifierUnderscores(markdown: string): string {
  const masked = maskCodeRegions(markdown);
  return masked.replace(/([0-9A-Za-z])_+(?=[0-9A-Za-z])/g, (match, lead: string) => {
    return lead + '&#95;'.repeat(match.length - 1);
  });
}

function mapUnderscoreSentinel(children: React.ReactNode): React.ReactNode {
  if (typeof children === 'string') return restoreLiteralUnderscores(children);
  if (Array.isArray(children)) return children.map(child => mapUnderscoreSentinel(child));
  return children;
}

function LiteralCode({ children, ...props }: React.HTMLAttributes<HTMLElement>) {
  return React.createElement('code', props, mapUnderscoreSentinel(children));
}

// A stable module-level object is required: markdown-to-jsx memoizes its
// parser on the options reference, so a fresh literal built on every render
// would defeat that memoization and re-run the compiler on every streamed
// token. optimizeForStreaming applies to every caller, not just the chat
// panel -- span attributes rendered in the GenAI span detail tab can be
// truncated at ingestion, so tolerating unclosed tags is desirable there too.
// That mode also deletes an unpaired `_`. Callers render identifiers through
// literalizeIdentifierUnderscores so `customer_id` stays literal.
export const sharedMarkdownOptions: MarkdownToJSX.Options = {
  disableParsingRawHTML: true,
  optimizeForStreaming: true,
  // Without this, markdown-to-jsx drops the wrapper element (and with it the
  // className carrying our styling) whenever the parsed output is a single
  // node -- e.g. any one-sentence reply with no inline formatting. Callers
  // rely on the wrapper always being present to apply consistent styling.
  forceWrapper: true,
  overrides: {
    pre: {
      props: {
        style: {
          background: 'var(--surface-secondary)',
          overflow: 'auto',
          padding: '0.5rem',
          borderRadius: '2px',
          fontSize: '0.85em',
        },
      },
    },
    code: {
      component: LiteralCode,
      props: {
        style: {
          background: 'var(--surface-secondary)',
          borderRadius: '2px',
          padding: '0.1em 0.3em',
          fontSize: '0.9em',
        },
      },
    },
    table: {
      props: { style: { borderCollapse: 'collapse' as const, width: '100%', marginBottom: '0.5rem' } },
    },
    th: {
      props: {
        style: {
          border: '1px solid var(--border-default)',
          padding: '0.3rem 0.5rem',
          background: 'var(--surface-secondary)',
          fontWeight: 600,
        },
      },
    },
    td: { props: { style: { border: '1px solid var(--border-default)', padding: '0.3rem 0.5rem' } } },
    blockquote: {
      props: {
        style: {
          borderLeft: '3px solid var(--border-default)',
          margin: '0 0 0.5rem',
          paddingLeft: '0.75rem',
        },
      },
    },
    a: {
      component: SafeLink,
    },
    img: {
      component: SafeImage,
    },
  },
};
