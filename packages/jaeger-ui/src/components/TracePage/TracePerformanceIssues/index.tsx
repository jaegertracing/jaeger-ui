import React, { useCallback, useMemo, useState } from 'react';
import { Trace } from '../../../types/trace';
import NPlus1Section from './NPlus1Section';
import { detectNPlus1Issues } from './processSpans';

type Props = {
  trace: Trace;
};

const TracePerformanceIssues: React.FC<Props> = props => {
  const { trace } = props;
  const [numberOfSpansQuery, setNumberOfSpansQuery] = useState(5);
  const [durationQuery, setDurationQuery] = useState(10);
  const [numberOfSpansRequest, setNumberOfSpansRequest] = useState(5);
  const [durationRequest, setDurationRequest] = useState(10);

  const updateNumberOfSpansQuery = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setNumberOfSpansQuery(parseInt(e?.target?.value, 10));
  }, []);

  const updateDurationQuery = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setDurationQuery(parseInt(e?.target?.value, 10));
  }, []);

  const updateNumberOfSpansRequest = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setNumberOfSpansRequest(parseInt(e?.target?.value, 10));
  }, []);

  const updateDurationRequest = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setDurationRequest(parseInt(e?.target?.value, 10));
  }, []);

  const { SpansWithQueryIssue: queryIssues, SpansWithRequestIssue: requestIssues } = useMemo(
    () =>
      detectNPlus1Issues(trace.spans, {
        queryThresholds: { minNumberOfSpans: numberOfSpansQuery, minDuration: durationQuery },
        requetsThresholds: { minNumberOfSpans: numberOfSpansRequest, minDuration: durationRequest },
      }),
    [trace.spans, numberOfSpansQuery, durationQuery, numberOfSpansRequest, durationRequest]
  );

  return (
    <div>
      <NPlus1Section
        title="N + 1 Query"
        issues={queryIssues}
        numberOfSpans={numberOfSpansQuery}
        duration={durationQuery}
        onUpdateNumberOfSpans={updateNumberOfSpansQuery}
        onUpdateDuration={updateDurationQuery}
      />
      <NPlus1Section
        title="N + 1 API"
        issues={requestIssues}
        numberOfSpans={numberOfSpansRequest}
        duration={durationRequest}
        onUpdateNumberOfSpans={updateNumberOfSpansRequest}
        onUpdateDuration={updateDurationRequest}
      />
    </div>
  );
};

export default TracePerformanceIssues;
