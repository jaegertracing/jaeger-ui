// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import { IEvent } from '../../../../types/otel';

/**
 * Which items of a {@link SpanDetail} component are expanded.
 */
export default class DetailState {
  isAttributesOpen: boolean;
  isResourceOpen: boolean;
  events: { isOpen: boolean; openedItems: Set<IEvent> };
  isWarningsOpen: boolean;
  isLinksOpen: boolean;

  constructor(oldState?: DetailState) {
    const {
      isAttributesOpen,
      isResourceOpen,
      isLinksOpen,
      isWarningsOpen,
      events,
    }: DetailState | Record<string, undefined> = oldState || {};
    this.isAttributesOpen = Boolean(isAttributesOpen);
    this.isResourceOpen = Boolean(isResourceOpen);
    this.isLinksOpen = Boolean(isLinksOpen);
    this.isWarningsOpen = Boolean(isWarningsOpen);
    this.events = {
      isOpen: events ? Boolean(events.isOpen) : true,
      openedItems: events && events.openedItems ? new Set(events.openedItems) : new Set(),
    };
  }

  toggleAttributes() {
    const next = new DetailState(this);
    next.isAttributesOpen = !this.isAttributesOpen;
    return next;
  }

  toggleResource() {
    const next = new DetailState(this);
    next.isResourceOpen = !this.isResourceOpen;
    return next;
  }

  toggleLinks() {
    const next = new DetailState(this);
    next.isLinksOpen = !this.isLinksOpen;
    return next;
  }

  toggleWarnings() {
    const next = new DetailState(this);
    next.isWarningsOpen = !this.isWarningsOpen;
    return next;
  }

  toggleEvents() {
    const next = new DetailState(this);
    next.events.isOpen = !this.events.isOpen;
    return next;
  }

  toggleEventItem(eventItem: IEvent) {
    const next = new DetailState(this);
    if (next.events.openedItems.has(eventItem)) {
      next.events.openedItems.delete(eventItem);
    } else {
      next.events.openedItems.add(eventItem);
    }
    return next;
  }

  // Legacy method names for backward compatibility
  toggleTags() {
    return this.toggleAttributes();
  }

  toggleProcess() {
    return this.toggleResource();
  }

  toggleReferences() {
    return this.toggleLinks();
  }

  toggleLogs() {
    return this.toggleEvents();
  }

  toggleLogItem(logItem: IEvent) {
    return this.toggleEventItem(logItem);
  }
}
