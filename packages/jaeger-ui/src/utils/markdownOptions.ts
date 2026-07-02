// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import type { MarkdownToJSX } from 'markdown-to-jsx';

function SafeLink({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  const isSafe =
    href && (href.startsWith('http://') || href.startsWith('https://') || href.startsWith('mailto:'));
  if (!isSafe) {
    return React.createElement('span', props, children);
  }
  return React.createElement('a', { ...props, href, target: '_blank', rel: 'noopener noreferrer' }, children);
}

function SafeImage({ alt, title }: React.ImgHTMLAttributes<HTMLImageElement>) {
  return React.createElement(
    'span',
    { className: 'JaegerAssistantPanel-image-placeholder' },
    `[Image: ${alt || title || 'unsupported'}]`
  );
}

export const sharedMarkdownOptions: MarkdownToJSX.Options = {
  disableParsingRawHTML: true,
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

// A stable object identity is required: markdown-to-jsx memoizes its parser
// on the options reference, so spreading a new options object on every
// render (e.g. { ...sharedMarkdownOptions, optimizeForStreaming: true })
// defeats that memoization and re-runs the compiler on every streamed token.
export const streamingMarkdownOptions: MarkdownToJSX.Options = {
  ...sharedMarkdownOptions,
  optimizeForStreaming: true,
};
