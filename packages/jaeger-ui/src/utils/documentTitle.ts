// Copyright (c) 2025 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';

type Props = {
  title?: string | null;
};

/**
 * DocumentTitle - minimal replacement for react-helmet title usage.
 * - Sets document.title to `title` when mounted/updated.
 * - Restores previous document.title when unmounted.
 *
 * Note: client-side only. For SSR/head management, consider react-helmet-async.
 */
const DocumentTitle: React.FC<Props> = ({ title }) => {
  const prevTitleRef = React.useRef<string | null>(typeof document !== 'undefined' ? document.title : null);

  React.useEffect(() => {
    if (typeof title === 'string' && title !== document.title) {
      document.title = title;
    }
  }, [title]);

  React.useEffect(() => {
    const previousTitle = prevTitleRef.current;
    return () => {
      if (previousTitle != null) {
        try {
          document.title = previousTitle;
        } catch {
          // ignore in weird test envs
        }
      }
    };
  }, []);

  return null;
};

export default DocumentTitle;
