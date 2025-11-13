// Copyright (c) 2025 The Jaeger Authors.
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
    return () => {
      if (prevTitleRef.current != null) {
        try {
          document.title = prevTitleRef.current;
        } catch (e) {
          // ignore in weird test envs
        }
      }
    };
  }, [title]);

  return null;
};

export default DocumentTitle;
