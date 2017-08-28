// @flow

// Copyright (c) 2017 Uber Technologies, Inc.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.

import type { Log } from '../../../../types';

// DetailState {
//   isTagsOpen: bool,
//   isProcessOpen: bool,
//   logs: {
//     isOpen: bool,
//     openItems: Set<Log>
//   }
// }

export default class DetailState {
  isTagsOpen: boolean;
  isProcessOpen: boolean;
  logs: { isOpen: boolean, openedItems: Set<Log> };

  constructor(oldState?: DetailState) {
    const { isTagsOpen, isProcessOpen, logs } = oldState || {};
    this.isTagsOpen = Boolean(isTagsOpen);
    this.isProcessOpen = Boolean(isProcessOpen);
    this.logs = {
      isOpen: Boolean(logs && logs.isOpen),
      openedItems: logs && logs.openedItems ? new Set(logs.openedItems) : new Set(),
    };
  }
  toggleTags() {
    const next = new DetailState(this);
    next.isTagsOpen = !this.isTagsOpen;
    return next;
  }
  toggleProcess() {
    const next = new DetailState(this);
    next.isProcessOpen = !this.isProcessOpen;
    return next;
  }
  toggleLogs() {
    const next = new DetailState(this);
    next.logs.isOpen = !this.logs.isOpen;
    return next;
  }
  toggleLogItem(logItem: Log) {
    const next = new DetailState(this);
    if (next.logs.openedItems.has(logItem)) {
      next.logs.openedItems.delete(logItem);
    } else {
      next.logs.openedItems.add(logItem);
    }
    return next;
  }
}
