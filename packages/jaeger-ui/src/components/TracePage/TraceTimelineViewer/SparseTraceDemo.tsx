// Copyright (c) 2024 The Jaeger Authors.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import React from 'react';
import { analyzeTraceGaps, createSparseViewedBoundsFunc, DEFAULT_SPARSE_TRACE_CONFIG } from './utils';
import TimelineGapComponent from './TimelineGap';

/**
 * Demo component to showcase the sparse trace visualization functionality
 * This demonstrates the issue #459 solution for sparse traces with long gaps
 */
export default function SparseTraceDemo() {
  // Example sparse trace data - simulates a consumer with significant delay
  const mockSpans = [
    {
      spanID: 'producer-span',
      traceID: 'trace-123',
      processID: 'p1',
      startTime: 1000000, // 1 second
      duration: 50000,    // 50ms
      operationName: 'produce-message',
      process: { serviceName: 'message-producer' },
      logs: [],
      tags: [],
      references: [],
    },
    {
      spanID: 'queue-span',
      traceID: 'trace-123',
      processID: 'p2',
      startTime: 1050000, // 1.05 seconds
      duration: 10000,    // 10ms
      operationName: 'queue-message',
      process: { serviceName: 'message-queue' },
      logs: [],
      tags: [],
      references: [],
    },
    // Large gap here - consumer processes after 5 minutes
    {
      spanID: 'consumer-span',
      traceID: 'trace-123',
      processID: 'p3',
      startTime: 301000000, // 301 seconds (5+ minutes later)
      duration: 100000,     // 100ms
      operationName: 'consume-message',
      process: { serviceName: 'message-consumer' },
      logs: [],
      tags: [],
      references: [],
    },
    {
      spanID: 'processor-span',
      traceID: 'trace-123',
      processID: 'p4',
      startTime: 301100000, // 301.1 seconds
      duration: 200000,     // 200ms
      operationName: 'process-message',
      process: { serviceName: 'message-processor' },
      logs: [],
      tags: [],
      references: [],
    },
  ];

  const traceStartTime = 1000000;
  const traceDuration = 300300000; // ~5 minutes total
  
  // Analyze gaps in the trace
  const gaps = analyzeTraceGaps(mockSpans, traceStartTime, traceDuration, DEFAULT_SPARSE_TRACE_CONFIG);
  
  // Create sparse view bounds function
  const viewRange = {
    min: traceStartTime,
    max: traceStartTime + traceDuration,
    viewStart: 0,
    viewEnd: 1,
  };
  
  const sparseViewBounds = createSparseViewedBoundsFunc(viewRange, gaps);
  const standardViewBounds = (start: number, end: number) => ({
    start: (start - traceStartTime) / traceDuration,
    end: (end - traceStartTime) / traceDuration,
  });

  const formatDuration = (microseconds: number) => {
    if (microseconds >= 1000000) {
      return `${(microseconds / 1000000).toFixed(1)}s`;
    }
    if (microseconds >= 1000) {
      return `${(microseconds / 1000).toFixed(1)}ms`;
    }
    return `${microseconds}μs`;
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h2>Sparse Trace Visualization Demo</h2>
      <p>
        This demonstrates the solution for <strong>Issue #459: Sparse traces visualisation</strong>
      </p>
      
      <div style={{ marginBottom: '20px' }}>
        <h3>Trace Overview</h3>
        <p>Total Duration: {formatDuration(traceDuration)}</p>
        <p>Spans: {mockSpans.length}</p>
        <p>Detected Gaps: {gaps.length}</p>
      </div>

      {gaps.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <h3>Detected Gaps</h3>
          {gaps.map((gap, index) => (
            <div key={index} style={{ 
              border: '1px solid #ddd', 
              padding: '10px', 
              margin: '5px 0',
              backgroundColor: gap.shouldCollapse ? '#e6f7ff' : '#f5f5f5'
            }}>
              <strong>Gap {index + 1}:</strong> {formatDuration(gap.duration)}
              <br />
              <small>
                From {formatDuration(gap.startTime - traceStartTime)} to {formatDuration(gap.endTime - traceStartTime)}
                {gap.shouldCollapse && ' (Will be collapsed)'}
              </small>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginBottom: '20px' }}>
        <h3>Timeline Comparison</h3>
        
        <div style={{ marginBottom: '15px' }}>
          <h4>Standard Timeline (Linear)</h4>
          <div style={{ 
            height: '40px', 
            border: '1px solid #ccc', 
            position: 'relative',
            backgroundColor: '#f9f9f9'
          }}>
            {mockSpans.map((span, index) => {
              const bounds = standardViewBounds(span.startTime, span.startTime + span.duration);
              return (
                <div
                  key={span.spanID}
                  style={{
                    position: 'absolute',
                    left: `${bounds.start * 100}%`,
                    width: `${Math.max((bounds.end - bounds.start) * 100, 0.5)}%`,
                    height: '30px',
                    top: '5px',
                    backgroundColor: `hsl(${index * 60}, 70%, 60%)`,
                    border: '1px solid #333',
                    fontSize: '10px',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    textShadow: '1px 1px 1px rgba(0,0,0,0.5)'
                  }}
                  title={`${span.operationName} (${formatDuration(span.duration)})`}
                >
                  {span.process.serviceName}
                </div>
              );
            })}
          </div>
          <p><small>Notice how the spans are barely visible due to the large gap</small></p>
        </div>

        <div>
          <h4>Sparse Timeline (Compressed Gaps)</h4>
          <div style={{ 
            height: '40px', 
            border: '1px solid #ccc', 
            position: 'relative',
            backgroundColor: '#f9f9f9'
          }}>
            {mockSpans.map((span, index) => {
              const bounds = sparseViewBounds(span.startTime, span.startTime + span.duration);
              return (
                <div
                  key={span.spanID}
                  style={{
                    position: 'absolute',
                    left: `${bounds.start * 100}%`,
                    width: `${Math.max((bounds.end - bounds.start) * 100, 2)}%`,
                    height: '30px',
                    top: '5px',
                    backgroundColor: `hsl(${index * 60}, 70%, 60%)`,
                    border: '1px solid #333',
                    fontSize: '10px',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    textShadow: '1px 1px 1px rgba(0,0,0,0.5)'
                  }}
                  title={`${span.operationName} (${formatDuration(span.duration)})`}
                >
                  {span.process.serviceName}
                </div>
              );
            })}
            
            {/* Show gap indicators */}
            {gaps.filter(gap => gap.shouldCollapse).map((gap, index) => {
              const gapStart = sparseViewBounds(gap.startTime, gap.startTime);
              const gapEnd = sparseViewBounds(gap.endTime, gap.endTime);
              return (
                <div
                  key={`gap-${index}`}
                  style={{
                    position: 'absolute',
                    left: `${gapStart.start * 100}%`,
                    width: `${(gapEnd.start - gapStart.start) * 100}%`,
                    height: '30px',
                    top: '5px',
                    backgroundColor: '#40a9ff',
                    border: '1px solid #1890ff',
                    fontSize: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontWeight: 'bold'
                  }}
                  title={`Collapsed gap: ${formatDuration(gap.duration)}`}
                >
                  ⚡ {formatDuration(gap.duration)}
                </div>
              );
            })}
          </div>
          <p><small>Spans are now clearly visible with compressed gaps shown as blue indicators</small></p>
        </div>
      </div>

      <div style={{ 
        backgroundColor: '#f0f8ff', 
        padding: '15px', 
        border: '1px solid #d6f7ff',
        borderRadius: '5px'
      }}>
        <h3>✅ Solution Benefits</h3>
        <ul>
          <li><strong>Better Visibility:</strong> Spans are clearly visible instead of being compressed into tiny slivers</li>
          <li><strong>Context Preservation:</strong> Gap information is preserved and displayed</li>
          <li><strong>Interactive:</strong> Gaps can be expanded/collapsed as needed</li>
          <li><strong>Configurable:</strong> Thresholds for gap detection can be adjusted</li>
          <li><strong>Performance:</strong> Maintains timeline performance with efficient rendering</li>
        </ul>
      </div>
    </div>
  );
}
