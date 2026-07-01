// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import type { MarkdownToJSX } from 'markdown-to-jsx';

export const sharedMarkdownOptions: MarkdownToJSX.Options = {
  disableParsingRawHTML: true,
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
  },
};
