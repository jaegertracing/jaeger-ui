import React from 'react';
import { Trace } from '../../../types/trace';
import NPlus1Section from './NPlus1Section';

type Props = {
  trace: Trace;
};

const TracePerformanceIssues: React.FC<Props> = props => {
  const { trace } = props;

  return (
    <div>
      <NPlus1Section spans={trace.spans} />
    </div>
  );
};

export default TracePerformanceIssues;
