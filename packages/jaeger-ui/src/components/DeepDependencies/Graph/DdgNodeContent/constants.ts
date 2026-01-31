// Copyright (c) 2019 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import { getUrl as getSearchUrl } from '../../../SearchTracePage/url';

// Constants for calculating circular node positioning
export const FONT_SIZE = 14;
export const FONT = `${FONT_SIZE}px Helvetica Nueue`;
export const LINE_HEIGHT = 1.5;
export const OP_PADDING_TOP = 5;
export const PROGRESS_BAR_STROKE_WIDTH = 15;
export const RADIUS = 75;
export const WORD_RX = /\W*\w+\W*/g;

// While browsers suport URLs of unlimited length, many server clients do not handle more than this max
// export const MAX_LENGTH = 2083;
// get unpreditable, unreproducable results past 7400 characters
export const MAX_LENGTH = 7000;
export const MAX_LINKED_TRACES = 35;
export const MIN_LENGTH = getSearchUrl().length;
export const PARAM_NAME_LENGTH = '&traceID='.length;
