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

import { getUrl as getSearchUrl } from '../../../SearchTracePage/url';

// A border radius of 1px has a maximum horizontal/vertical thickness of Math.sqrt(2). Double for both sides.
// export const CURVED_BORDER_THICKNESS = 2 * Math.sqrt(2);
export const FONT_SIZE = 14;
export const FONT = `${FONT_SIZE}px Helvetica Nueue`;
export const LINE_HEIGHT = 1.5;
export const RADIUS_MARGIN = 3;

export const WORD_RX = /\W*\w+\W*/g;

// While browsers suport URLs of unlimited length, many server clients do not handle more than this max
export const MAX_LENGTH = 2083;
export const MAX_LINKED_TRACES = 35;
export const MIN_LENGTH = getSearchUrl().length;
export const PARAM_NAME_LENGTH = '&traceID='.length;

export const OP_PADDING_TOP = 5; // might be margin?
