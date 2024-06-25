import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Span } from '../../../types/trace';
import { SpanExtended, detectNPlus1Queries } from './processSpans';
import NPlus1Chart from './NPlus1Chart';
import './index.css';

type Props = {
  spans: Span[];
};

const NPlus1Section: React.FC<Props> = props => {
  const { spans } = props;
  const [numberOfSpans, setNumberOfSpans] = useState(5);
  const [duration, setDuration] = useState(20);
  const numberOfSpansRef = useRef();
  const durationRef = useRef();

  const updateDuration = useCallback(e => {
    setDuration(e.target.value);
  }, []);

  const updateNumberOfSpans = useCallback(e => {
    setNumberOfSpans(e.target.value);
  }, []);

  const nPlus1Issues = useMemo(
    () => detectNPlus1Queries(spans, numberOfSpans, duration),
    [spans, numberOfSpans, duration]
  );

  return (
    <div>
      <div className="PerformanceIssuesHeader">
        <h3>N + 1 Query</h3>
        <div className="PerformanceIssuesParameters">
          <div>Thresholds: </div>
          <div className="PerformanceIssuesParameter">
            <span>Min duration (ms): </span>
            <input ref={durationRef} type="number" value={duration} onChange={updateDuration} />
          </div>
          <div className="PerformanceIssuesParameter">
            <span>Min number of spans: </span>
            <input
              ref={numberOfSpansRef}
              type="number"
              value={numberOfSpans}
              onChange={updateNumberOfSpans}
            />
          </div>
        </div>
      </div>
      {Object.keys(nPlus1Issues).length > 0 && (
        <div className="IssueContainerWrapper">
          {Object.values(nPlus1Issues).map(issue => (
            <NPlus1Chart
              spans={issue.spans as SpanExtended[]}
              duration={issue.duration}
              startTime={issue.startTime}
              endTime={issue.endTime}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default NPlus1Section;
