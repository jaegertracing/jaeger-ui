import React from 'react';
import './SpanBarRow.css';

type Props = {
  children?: React.ReactNode;
  className?: string;
  // keep props permissive to avoid touching surrounding code
  [key: string]: any;
};

const SpanBarRow: React.FC<Props> = ({ children, className = '', ...rest }) => {
  return (
    <div className={`trace-timeline__row ${className}`} {...rest}>
      {/* Left column: Service & Operation (existing content should remain here in real file) */}
      <div className="trace-timeline__row-left">
        {/* placeholder for existing left-side UI */}
        <div className="trace-timeline__service-operation">Service / Operation</div>
      </div>

      {/* New middle status column (static for now) */}
      <div className="trace-timeline__status-column">ok</div>

      {/* Right column: Gantt chart / span bar */}
      <div className="trace-timeline__row-right">{children}</div>
    </div>
  );
};

export default SpanBarRow;