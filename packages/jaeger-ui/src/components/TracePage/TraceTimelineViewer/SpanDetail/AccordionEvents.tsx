// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import cx from 'classnames';
import _sortBy from 'lodash/sortBy';
import { IoChevronDown, IoChevronForward } from 'react-icons/io5';

import AccordianKeyValues from './AccordianKeyValues';
import { formatDuration } from '../utils';
import { TNil } from '../../../../types';
import { Log, KeyValuePair, Link } from '../../../../types/trace';

import './AccordianLogs.css';

type AccordianLogsProps = {
  interactive?: boolean;
  isOpen: boolean;
  linksGetter?: ((pairs: ReadonlyArray<KeyValuePair>, index: number) => Link[]) | TNil;
  logs: ReadonlyArray<Log>;
  onItemToggle?: (log: Log) => void;
  onToggle?: () => void;
  openedItems?: Set<Log>;
  timestamp: number;
  currentViewRangeTime: [number, number];
  traceDuration: number;
  initialVisibleCount?: number;
  spanID?: string;
  useOtelTerms: boolean;
};

export default function AccordianLogs({
  interactive = true,
  isOpen,
  linksGetter,
  logs,
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
  const [showOutOfRangeLogs, setShowOutOfRangeLogs] = React.useState(false);
  const [showAllLogs, setShowAllLogs] = React.useState(false);
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
    return logs.filter(log => log.timestamp >= viewStartAbsolute && log.timestamp <= viewEndAbsolute);
  }, [logs, timestamp, currentViewRangeTime, traceDuration]);

  const eventsToDisplay = showOutOfRangeEvents ? events : inRangeEvents;
  const displayedCount = eventsToDisplay.length;
  const inRangeCount = inRangeEvents.length;
  const totalCount = events.length;

  let title = `Logs (${displayedCount})`;
  let toggleLink: React.ReactNode = null;

  if (!showOutOfRangeLogs && inRangeCount < totalCount) {
    title = `Logs (${inRangeCount} of ${totalCount})`;
    toggleLink = (
      <button
        type="button"
        className="AccordianLogs--toggle"
        onClick={() => {
          setShowOutOfRangeLogs(true);
          notifyListReflow();
        }}
      >
        show all
      </button>
    );
  } else if (showOutOfRangeLogs && inRangeCount < totalCount) {
    title = `Logs (${totalCount})`;
    toggleLink = (
      <button
        type="button"
        className="AccordianLogs--toggle"
        onClick={() => {
          setShowOutOfRangeLogs(false);
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
    <div className="AccordianLogs">
      <HeaderComponent className={cx('AccordianLogs--header', { 'is-open': isOpen })} {...headerProps}>
        {arrow} <strong>{title}</strong> {toggleLink}
      </HeaderComponent>
      {isOpen && (
        <div className="AccordianLogs--content" ref={contentRef}>
          {(() => {
            const sortedEvents = _sortBy(eventsToDisplay, event => event.timeUnixMicro);
            const visibleLogs =
              interactive && !showAllEvents && sortedEvents.length > initialVisibleCount
                ? sortedEvents.slice(0, initialVisibleCount)
                : sortedEvents;
            return visibleLogs.map((event, i) => (
              <AccordionAttributes
                // `i` is necessary in the key because timestamps can repeat

                key={`${log.timestamp}-${i}`}
                className={i < visibleLogs.length - 1 ? 'ub-mb1' : null}
                data={log.fields || []}
                highContrast
                interactive={interactive}
                isOpen={openedItems ? openedItems.has(log) : false}
                label={`${formatDuration(log.timestamp - timestamp)}`}
                linksGetter={linksGetter}
                onToggle={interactive && onItemToggle ? () => onItemToggle(log) : null}
              />
            ));
          })()}
          {interactive &&
            _sortBy(eventsToDisplay, event => event.timeUnixMicro).length > initialVisibleCount && (
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
