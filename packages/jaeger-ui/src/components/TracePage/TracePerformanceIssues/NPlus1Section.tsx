import React, { useRef } from 'react';
import { SpanExtended } from './processSpans';
import NPlus1Chart from './NPlus1Chart';
import './index.css';

type Props = {
  title: string;
  issues: object;
  numberOfSpans: number;
  duration: number;
  onUpdateNumberOfSpans: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onUpdateDuration: (e: React.ChangeEvent<HTMLInputElement>) => void;
};

const NPlus1Section: React.FC<Props> = props => {
  const { title, issues, onUpdateNumberOfSpans, onUpdateDuration, numberOfSpans, duration } = props;
  const numberOfSpansRef = useRef();
  const durationRef = useRef();

  return (
    <div>
      <div className="PerformanceIssuesHeader">
        <h3>{title}</h3>
        <div className="PerformanceIssuesParameters">
          <div>Thresholds: </div>
          <div className="PerformanceIssuesParameter">
            <span>Min duration (ms): </span>
            <input ref={durationRef} min={1} type="number" value={duration} onChange={onUpdateDuration} />
          </div>
          <div className="PerformanceIssuesParameter">
            <span>Min number of spans: </span>
            <input
              ref={numberOfSpansRef}
              min={1}
              type="number"
              value={numberOfSpans}
              onChange={onUpdateNumberOfSpans}
            />
          </div>
        </div>
      </div>
      {Object.keys(issues).length > 0 && (
        <div className="IssueContainerWrapper">
          {Object.values(issues).map(issue => (
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
