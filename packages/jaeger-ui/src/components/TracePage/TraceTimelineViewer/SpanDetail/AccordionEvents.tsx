// Copyright (c) 2026 The Jaeger Authors.
// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import cx from 'classnames';
import _sortBy from 'lodash/sortBy';
import { IoChevronDown, IoChevronForward } from 'react-icons/io5';

import AccordionAttributes from './AccordionAttributes';
import { formatDuration } from '../utils';
import { TNil } from '../../../../types';
import { Hyperlink } from '../../../../types/hyperlink';
import { IEvent, IAttribute } from '../../../../types/otel';

import './AccordionEvents.css';

type AccordionEventsProps = {
  interactive?: boolean;
  isOpen: boolean;
  linksGetter?: ((pairs: ReadonlyArray<IAttribute>, index: number) => Hyperlink[]) | TNil;
  events: ReadonlyArray<IEvent>;
  onItemToggle?: (event: IEvent) => void;
  onToggle?: () => void;
  openedItems?: Set<IEvent>;
  timestamp: number;
  currentViewRangeTime: [number, number];
  traceDuration: number;
  initialVisibleCount?: number;
  spanID?: string;
  useOtelTerms: boolean;
};

export default function AccordionEvents({
  interactive = true,
  isOpen,
  linksGetter,
  events,
  openedItems,
  onItemToggle,
  onToggle,
  timestamp,
  currentViewRangeTime,
  traceDuration,
  initialVisibleCount = 3,
  spanID,
  useOtelTerms,
}: AccordionEventsProps) {
  let arrow: React.ReactNode | null = null;
  let HeaderComponent: 'span' | 'a' = 'span';
  let headerProps: object | null = null;
  const [showOutOfRangeEvents, setShowOutOfRangeEvents] = React.useState(false);
  const [showAllEvents, setShowAllEvents] = React.useState(false);
  const contentRef = React.useRef<HTMLDivElement | null>(null);

  const notifyListReflow = React.useCallback(() => {
    const emit = () => {
      try {
        if (spanID) {
          window.dispatchEvent(new CustomEvent('jaeger:detail-measure', { detail: { spanID } }));
        } else {
          window.dispatchEvent(new Event('jaeger:list-resize'));
        }
      } catch (error) {
        void error;
      }
    };

    setTimeout(emit);
    if (typeof window !== 'undefined' && 'requestAnimationFrame' in window) {
      window.requestAnimationFrame(emit);
    }
    setTimeout(emit, 50);
  }, []);

  // Observe height changes in the content area to notify virtualized list to reflow
  React.useEffect(() => {
    if (!interactive || !isOpen) return;
    const target = contentRef.current;
    if (!target) return;

    let ro: ResizeObserver | null = null;
    let mo: MutationObserver | null = null;
    const callback = () => notifyListReflow();

    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(callback as ResizeObserverCallback);
      if (ro) ro.observe(target);
    } else if (typeof window !== 'undefined' && typeof MutationObserver !== 'undefined') {
      mo = new MutationObserver(callback);
      mo.observe(target, { childList: true, subtree: true });
    }

    return () => {
      if (ro) {
        try {
          ro.disconnect();
        } catch (error) {
          void error;
        }
      }
      if (mo) {
        try {
          mo.disconnect();
        } catch (error) {
          void error;
        }
      }
    };
  }, [interactive, isOpen, notifyListReflow]);

  const inRangeEvents = React.useMemo(() => {
    const viewStartAbsolute = timestamp + currentViewRangeTime[0] * traceDuration;
    const viewEndAbsolute = timestamp + currentViewRangeTime[1] * traceDuration;
    return events.filter(event => {
      return event.timestamp >= viewStartAbsolute && event.timestamp <= viewEndAbsolute;
    });
  }, [events, timestamp, currentViewRangeTime, traceDuration]);

  const eventsToDisplay = showOutOfRangeEvents ? events : inRangeEvents;
  const displayedCount = eventsToDisplay.length;
  const inRangeCount = inRangeEvents.length;
  const totalCount = events.length;

  const label = useOtelTerms ? 'Events' : 'Logs';
  let title = `${label} (${displayedCount})`;
  let toggleLink: React.ReactNode = null;

  if (!showOutOfRangeEvents && inRangeCount < totalCount) {
    title = `${label} (${inRangeCount} of ${totalCount})`;
    toggleLink = (
      <button
        type="button"
        className="AccordionEvents--toggle"
        onClick={() => {
          setShowOutOfRangeEvents(true);
          notifyListReflow();
        }}
      >
        show all
      </button>
    );
  } else if (showOutOfRangeEvents && inRangeCount < totalCount) {
    title = `${label} (${totalCount})`;
    toggleLink = (
      <button
        type="button"
        className="AccordionEvents--toggle"
        onClick={() => {
          setShowOutOfRangeEvents(false);
          notifyListReflow();
        }}
      >
        show in range
      </button>
    );
  }

  if (interactive) {
    arrow = isOpen ? (
      <IoChevronDown className="u-align-icon" />
    ) : (
      <IoChevronForward className="u-align-icon" />
    );
    HeaderComponent = 'a';
    headerProps = {
      'aria-checked': isOpen,
      onClick: onToggle,
      role: 'switch',
    };
  }

  return (
    <div className="AccordionEvents">
      <HeaderComponent className={cx('AccordionEvents--header', { 'is-open': isOpen })} {...headerProps}>
        {arrow} <strong>{title}</strong> {toggleLink}
      </HeaderComponent>
      {isOpen && (
        <div className="AccordionEvents--content" ref={contentRef}>
          {(() => {
            const sortedEvents = _sortBy(eventsToDisplay, event => event.timestamp);
            const visibleLogs =
              interactive && !showAllEvents && sortedEvents.length > initialVisibleCount
                ? sortedEvents.slice(0, initialVisibleCount)
                : sortedEvents;
            return visibleLogs.map((event, i) => {
              const durationLabel = formatDuration(event.timestamp - timestamp);
              const labelContent = useOtelTerms ? `${event.name} (${durationLabel})` : durationLabel;
              return (
                <AccordionAttributes
                  // `i` is necessary in the key because timestamps can repeat

                  key={`${event.timestamp}-${i}`}
                  className={i < visibleLogs.length - 1 ? 'ub-mb1' : null}
                  data={event.attributes}
                  highContrast
                  interactive={interactive}
                  isOpen={openedItems ? openedItems.has(event) : false}
                  label={labelContent}
                  linksGetter={linksGetter}
                  onToggle={interactive && onItemToggle ? () => onItemToggle(event) : null}
                />
              );
            });
          })()}
          {interactive && _sortBy(eventsToDisplay, event => event.timestamp).length > initialVisibleCount && (
            <div>
              {!showAllEvents ? (
                <button
                  type="button"
                  className="AccordionEvents--toggle"
                  onClick={() => {
                    setShowAllEvents(true);
                    notifyListReflow();
                  }}
                >
                  show more...
                </button>
              ) : (
                <button
                  type="button"
                  className="AccordionEvents--toggle"
                  onClick={() => {
                    setShowAllEvents(false);
                    notifyListReflow();
                  }}
                >
                  show less
                </button>
              )}
            </div>
          )}
          <small className="AccordionEvents--footer">
            {useOtelTerms ? 'Event' : 'Log'} timestamps are relative to the start time of the full trace.
          </small>
        </div>
      )}
    </div>
  );
}
