// Copyright (c) 2018 Uber Technologies, Inc.
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

// SVG is from React Icons:
// https://github.com/react-icons/react-icons/blob/396b4d9241a61b6d22f3907273158b6a91aea2fd/md/zoom-out-map.js
// LICENSE: MIT
// https://github.com/react-icons/react-icons/blob/396b4d9241a61b6d22f3907273158b6a91aea2fd/package.json#L26
export const resetZoomIcon = (
  <svg fill="currentColor" preserveAspectRatio="xMidYMid meet" height="1em" width="1em" viewBox="0 0 40 40">
    <g>
      <path d="m35 25v10h-10l3.8-3.8-4.8-4.8 2.4-2.4 4.8 4.8z m-20 10h-10v-10l3.8 3.8 4.8-4.8 2.4 2.4-4.8 4.8z m-10-20v-10h10l-3.8 3.8 4.8 4.8-2.4 2.4-4.8-4.8z m20-10h10v10l-3.8-3.8-4.8 4.8-2.4-2.4 4.8-4.8z" />
    </g>
  </svg>
);

export const zoomInIcon = (
  <svg viewBox="0 0 512 512" fill="currentColor" height="1em" width="1em">
    <path d="M416 208c0 45.9-14.9 88.3-40 122.7l126.6 126.7c12.5 12.5 12.5 32.8 0 45.3s-32.8 12.5-45.3 0L330.7 376c-34.4 25.2-76.8 40-122.7 40C93.1 416 0 322.9 0 208S93.1 0 208 0s208 93.1 208 208zm-232 88c0 13.3 10.7 24 24 24s24-10.7 24-24v-64h64c13.3 0 24-10.7 24-24s-10.7-24-24-24h-64v-64c0-13.3-10.7-24-24-24s-24 10.7-24 24v64h-64c-13.3 0-24 10.7-24 24s10.7 24 24 24h64v64z" />
  </svg>
);

export const zoomOutIcon = (
  <svg viewBox="0 0 512 512" fill="currentColor" height="1em" width="1em">
    <path d="M416 208c0 45.9-14.9 88.3-40 122.7l126.6 126.7c12.5 12.5 12.5 32.8 0 45.3s-32.8 12.5-45.3 0L330.7 376c-34.4 25.2-76.8 40-122.7 40C93.1 416 0 322.9 0 208S93.1 0 208 0s208 93.1 208 208zm-280-24c-13.3 0-24 10.7-24 24s10.7 24 24 24h144c13.3 0 24-10.7 24-24s-10.7-24-24-24H136z" />
  </svg>
);
