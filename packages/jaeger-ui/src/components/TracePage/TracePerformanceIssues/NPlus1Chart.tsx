import React from 'react';
import { SpanExtended } from './processSpans';
import './NPlus1Chart.css';

type Props = {
  spans: SpanExtended[];
  duration: number;
  startTime: number;
  endTime: number;
};

const NPlus1Chart: React.FC<Props> = props => {
  const { spans, duration, startTime } = props;
  let repeatingOperation = '';
  let repeatingCode = '';
  if (spans?.[0]?.isQuerySpan) {
    repeatingOperation = 'Repeating query';
    repeatingCode = spans?.[0]?.queryStatement?.value || '';
  } else if (spans?.[0]?.isRequestSpan) {
    repeatingOperation = 'Repeating request';
    const value = spans?.[0]?.serverRequest;
    repeatingCode = `${value.method} - ${value.route}`;
  }
  const spanRows = spans.map((span: SpanExtended, index: number, arr: SpanExtended[]) => {
    const timeStart = span.relativeStartTime - startTime;

    return (
      <div
        className="ChartSpanRowWrapper"
        style={{ backgroundColor: index % 2 === 0 ? '#f8f8f8' : '#e1e1e1' }}
      >
        <div className="ChartSpanName">
          <div className="ChartSpanNameService">{`${span.process.serviceName}`}</div>
          <div>&nbsp; - &nbsp;</div>
          <div className="ChartSpanNameOperation">{`${span.operationName}`}</div>
        </div>
        <div className="ChartSpanBarWrapper">
          <div
            className="ChartSpanBar"
            style={{
              width: `${(span.duration / duration) * 100}%`,
              left: `${(timeStart / duration) * 100}%`,
            }}
          />
          <span
            className="ChartSpanDuration"
            style={{
              right:
                index >= arr.length / 2 ? `calc(${((duration - timeStart) / duration) * 100}% + 4px)` : '',
              left:
                index < arr.length / 2
                  ? `calc(${(timeStart / duration + span.duration / duration) * 100}% + 4px)`
                  : '',
            }}
          >{`${span.duration / 1000} ms`}</span>
        </div>
      </div>
    );
  });

  return (
    <div className="ChartWrapper">
      <div className="ChartDescription">
        <div className="ChartDescriptionParameter">
          <div>Duration</div>
          <div>{`${Math.round(duration / 1000)} ms`}</div>
        </div>
        <div className="ChartDescriptionParameter">
          <div>Number of repetitions</div>
          <div>{spans.length}</div>
        </div>
        <div className="ChartDescriptionParameter">
          <div>{repeatingOperation}</div>
          <div>{repeatingCode}</div>
        </div>
      </div>
      {spanRows}
    </div>
  );
};

export default NPlus1Chart;
