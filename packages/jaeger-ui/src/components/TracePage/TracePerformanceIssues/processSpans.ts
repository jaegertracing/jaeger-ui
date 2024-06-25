import _ from 'lodash';
import { KeyValuePair, Span, SpanReference } from '../../../types/trace';

export type SpanExtended = Span & {
  spanIndex: number;
  parentID?: string;
  groupId?: string;
  isQuerySpan?: boolean;
  queryStatement?: KeyValuePair;
};

function areOverlappedSpans(prevSpan: Span | null, newSpan: Span | null): boolean {
  if (!prevSpan || !newSpan) return false;
  return prevSpan.relativeStartTime + prevSpan.duration >= newSpan.relativeStartTime;
}

function areConsecutiveIndices(indices: number[]): boolean {
  if (indices.length <= 1) return true; // An array with 0 or 1 element is trivially consecutive

  // Sort the array and remove duplicates
  const sortedIndices = _.sortedUniq(indices.sort((a, b) => a - b));

  // Check for consecutive elements
  for (let i = 1; i < sortedIndices.length; i++) {
    if (sortedIndices[i] !== sortedIndices[i - 1] + 1) {
      return false;
    }
  }

  return true;
}

function getChildSpanIndices(span: Span, objectSpans: object, spanCallback: Function): number[] {
  const indices: number[] = [];
  if (span.hasChildren) {
    span.childSpanIds.forEach((spanId: string) => {
      const childSpan = objectSpans[spanId];
      if (childSpan) {
        if (childSpan.operationName.toUpperCase().includes('SELECT')) {
          spanCallback(childSpan.tags.find((tag: KeyValuePair) => tag.key === 'db.statement'));
        }
        indices.push(childSpan.spanIndex);
        indices.push(...getChildSpanIndices(childSpan, objectSpans, spanCallback));
      }
    });
  }
  return indices;
}

function updateSpansForNPlus1QueryDetection(spans: SpanExtended[], dbObjectSpans: object): SpanExtended[] {
  // Used to easy grouping
  let spansGroupId = crypto.randomUUID();
  let previousSpan: SpanExtended | null = null;
  let previousSpanIndex: number = -1;

  return spans.map((span: SpanExtended) => {
    // Used to determine if the current span has a query (in their children)
    let isQuerySpan: boolean = false;
    let queryStatement: KeyValuePair | null = null;
    const checkQuery = (statement: KeyValuePair) => {
      if (statement) {
        isQuerySpan = true;
        queryStatement = statement;
      }
    };

    // Concat indices to determine consecutiveness:
    // - previous span
    // - current span
    // - children of current span
    const childIndices = getChildSpanIndices(span, dbObjectSpans, checkQuery);
    let allIndices = [span.spanIndex, ...childIndices];
    if (previousSpanIndex >= 0) {
      allIndices = [previousSpanIndex, ...allIndices];
    }

    // Check criteria to generate new group of spans
    const areSpansConsecutive = areConsecutiveIndices(allIndices);
    const areSpansOverlapped = areOverlappedSpans(previousSpan, span);
    if (!isQuerySpan || !areSpansConsecutive || areSpansOverlapped) {
      spansGroupId = crypto.randomUUID();
    }

    // Generate new span
    const newSpan = { ...span };
    newSpan.groupId = spansGroupId;
    newSpan.isQuerySpan = isQuerySpan;
    if (isQuerySpan && queryStatement) {
      newSpan.queryStatement = queryStatement;
    }

    // Set var for next cycle
    previousSpan = span;
    previousSpanIndex = allIndices.pop() || -1;

    return newSpan;
  });
}

export function detectNPlus1Queries(
  spans: Span[],
  numberOfSpans: number,
  totalDurationOfSpans: number
): object {
  // Spans as object to easy access of a span using its id
  const dbObjectSpans = {};

  // Gets spans that has a parentID
  const dbSpans: SpanExtended[] = spans.flatMap((span: Span, index: number) => {
    Object.assign(dbObjectSpans, { [span.spanID]: { spanIndex: index, ...span } });
    return span.references
      .filter((reference: SpanReference) => reference.refType === 'CHILD_OF')
      .map((reference: SpanReference) => ({ parentID: reference.spanID, spanIndex: index, ...span }));
  });

  // Group spans by parentID
  const spansByParent = _.groupBy(dbSpans, 'parentID');

  console.log('spans by parent', spansByParent);
  // Filter spans by number of spans threshold
  const SpansWithIssue = {};
  Object.keys(spansByParent).forEach((key: string) => {
    if (spansByParent[key].length >= numberOfSpans) {
      const spansByOperationName = _.groupBy(spansByParent[key], 'operationName');
      // In each group of spans, check if they are doing query operations in the db
      Object.keys(spansByOperationName).forEach((operationName: string) => {
        if (operationName.toUpperCase().includes('SELECT')) {
          // TODO: Implement
        } else {
          const spansInOperation = spansByOperationName[operationName];
          const updatedSpansInOperation = updateSpansForNPlus1QueryDetection(spansInOperation, dbObjectSpans);
          const spansWithQueryIssue = updatedSpansInOperation.filter(span => span.isQuerySpan);
          const spansWithQueryIssueByGroup = _.groupBy(spansWithQueryIssue, 'groupId');

          Object.keys(spansWithQueryIssueByGroup).forEach(groupKey => {
            let totalSpanDuration = 0;
            const currentSpans = spansWithQueryIssueByGroup[groupKey] || [];
            let startTime = Infinity;
            let endTime = -Infinity;
            currentSpans.forEach(span => {
              totalSpanDuration += span.duration;
              startTime = span.relativeStartTime < startTime ? span.relativeStartTime : startTime;
              const timeEnd = span.relativeStartTime + span.duration;
              endTime = timeEnd > endTime ? timeEnd : endTime;
            });
            totalSpanDuration /= 1000;
            const totalRangeDuration = endTime - startTime;

            if (
              spansWithQueryIssueByGroup[groupKey].length >= numberOfSpans &&
              totalSpanDuration >= totalDurationOfSpans
            ) {
              Object.assign(SpansWithIssue, {
                [groupKey]: {
                  spans: spansWithQueryIssueByGroup[groupKey],
                  duration: totalRangeDuration,
                  startTime,
                  endTime,
                },
              });
            }
          });
        }
      });
    }
  });
  return SpansWithIssue;
}
