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

// DetailState {
//   isTagsOpen: bool,
//   isProcessOpen: bool,
//   logs: {
//     isOpen: bool,
//     openItems: Set<LogItem>
//   }
// }
export default class DetailState {
  constructor({ isTagsOpen, isProcessOpen, logs } = {}) {
    this.isTagsOpen = isTagsOpen;
    this.isProcessOpen = isProcessOpen;
    this.logs = {
      isOpen: logs && logs.isOpen,
      openItems: logs && logs.openItems ? new Set(logs.openItems) : new Set(),
    };
  }
  toggleTags() {
    const next = new DetailState(this);
    next.isTagsOpen = !this.isTagsOpen;
    return next;
  }
  toggleProcess() {
    const next = new DetailState(this);
    next.isTagsOpen = !this.isTagsOpen;
    return next;
  }
  toggleLogs() {
    const next = new DetailState(this);
    next.logs.isOpen = !this.logs.isOpen;
    return next;
  }
  toggleLogItem(logItem) {
    const next = new DetailState(this);
    if (next.logs.openItems.has(logItem)) {
      next.logs.openItems.delete(logItem);
    } else {
      next.logs.openItems.add(logItem);
    }
    return next;
  }
}
