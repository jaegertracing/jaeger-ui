import _ from 'lodash';
import { KeyValuePair, Span, SpanReference } from '../../../types/trace';

export type SpanExtended = Span & {
  spanIndex: number;
  parentID?: string;
  groupId?: string;
  isQuerySpan?: boolean;
  queryStatement?: KeyValuePair;
  isRequestSpan?: boolean;
  serverRequest: { method: string; route: string };
};

export type IssueThresholds = {
  minDuration: number;
  minNumberOfSpans: number;
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

function getChildSpanIndices(
  span: Span,
  objectSpans: object,
  spanCallback: { query: Function; request: Function }
): number[] {
  const indices: number[] = [];
  if (span.hasChildren) {
    span.childSpanIds.forEach((spanId: string) => {
      const childSpan = objectSpans[spanId];
      if (childSpan) {
        if (childSpan.operationName.toUpperCase().includes('SELECT')) {
          spanCallback.query(childSpan.tags.find((tag: KeyValuePair) => tag.key === 'db.statement'));
        }
        if (childSpan.operationName.toUpperCase().includes('POST')) {
          const serverRequest: { method: string; route: string } = { method: '', route: '' };
          childSpan.tags.forEach((tag: KeyValuePair) => {
            if (tag.key === 'http.method') {
              serverRequest.method = tag.value;
            } else if (tag.key === 'http.route') {
              serverRequest.route = tag.value;
            }
          });
          spanCallback.request(serverRequest);
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

    // Used to determine if the current span has a request (in their children)
    let isRequestSpan: boolean = false;
    const serverRequest: { method: string; route: string } = { method: '', route: '' };
    const checkRequest = (request: { method: string; route: string }) => {
      isRequestSpan = true;
      serverRequest.method = request?.method !== '' ? request.method : serverRequest.method;
      serverRequest.route = request?.route !== '' ? request.route : serverRequest.route;
    };

    // Concat indices to determine consecutiveness:
    // - previous span
    // - current span
    // - children of current span
    const childIndices = getChildSpanIndices(span, dbObjectSpans, {
      query: checkQuery,
      request: checkRequest,
    });
    let allIndices = [span.spanIndex, ...childIndices];
    if (previousSpanIndex >= 0) {
      allIndices = [previousSpanIndex, ...allIndices];
    }

    // Check criteria to generate new group of spans
    const areSpansConsecutive = areConsecutiveIndices(allIndices);
    const areSpansOverlapped = areOverlappedSpans(previousSpan, span);
    if (
      (previousSpan?.isQuerySpan && !isQuerySpan) ||
      (previousSpan?.isRequestSpan && !isRequestSpan) ||
      !areSpansConsecutive ||
      areSpansOverlapped
    ) {
      spansGroupId = crypto.randomUUID();
    }

    // Generate new span
    const newSpan = { ...span };
    newSpan.groupId = spansGroupId;
    newSpan.isQuerySpan = isQuerySpan;
    if (isQuerySpan && queryStatement) {
      newSpan.queryStatement = queryStatement;
    }

    newSpan.isRequestSpan = isRequestSpan;
    if (isRequestSpan && serverRequest.method !== '' && serverRequest.route !== '') {
      newSpan.serverRequest = serverRequest;
    }

    // Set var for next cycle
    previousSpan = span;
    previousSpanIndex = allIndices.pop() || -1;

    return newSpan;
  });
}

function filterGroupOfSpansByThresholds(
  groupOfSpansWithIssue: object,
  objectWithGroupsOfSpansWithIssue: object,
  thresholds: IssueThresholds
) {
  Object.entries(groupOfSpansWithIssue).forEach(([groupKey, groupValue]) => {
    const currentSpans = groupValue || [];
    let totalSpanDuration = 0;
    let startTime = Infinity;
    let endTime = -Infinity;
    currentSpans.forEach((span: SpanExtended) => {
      totalSpanDuration += span.duration;
      startTime = span.relativeStartTime < startTime ? span.relativeStartTime : startTime;
      const timeEnd = span.relativeStartTime + span.duration;
      endTime = timeEnd > endTime ? timeEnd : endTime;
    });
    totalSpanDuration /= 1000;
    const totalRangeDuration = endTime - startTime;

    if (groupValue.length >= thresholds.minNumberOfSpans && totalSpanDuration >= thresholds.minDuration) {
      Object.assign(objectWithGroupsOfSpansWithIssue, {
        [groupKey]: {
          spans: groupValue,
          duration: totalRangeDuration,
          startTime,
          endTime,
        },
      });
    }
  });
}

export function detectNPlus1Issues(
  spans: Span[],
  issueThresholds: {
    queryThresholds: IssueThresholds;
    requetsThresholds: IssueThresholds;
  }
): {
  SpansWithQueryIssue: object;
  SpansWithRequestIssue: object;
} {
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

  // Filter spans by number of spans threshold
  const SpansWithQueryIssue = {};
  const SpansWithRequestIssue = {};
  Object.keys(spansByParent).forEach((key: string) => {
    if (spansByParent[key].length >= 5) {
      const spansByOperationName = _.groupBy(spansByParent[key], 'operationName');
      // In each group of spans, check if they are doing query operations in the db
      Object.keys(spansByOperationName).forEach((operationName: string) => {
        if (operationName.toUpperCase().includes('SELECT') || operationName.toUpperCase().includes('POST')) {
          // TODO: Implement
        } else {
          const spansInOperation = spansByOperationName[operationName];
          const updatedSpansInOperation = updateSpansForNPlus1QueryDetection(spansInOperation, dbObjectSpans);
          const spansWithQueryIssue = updatedSpansInOperation.filter(span => span.isQuerySpan);
          const spansWithQueryIssueByGroup = _.groupBy(spansWithQueryIssue, 'groupId');
          const spansWithServerRequestIssue = updatedSpansInOperation.filter(span => span.isRequestSpan);
          const spansWithServerRequestIssueByGroup = _.groupBy(spansWithServerRequestIssue, 'groupId');

          filterGroupOfSpansByThresholds(
            spansWithQueryIssueByGroup,
            SpansWithQueryIssue,
            issueThresholds.queryThresholds
          );
          filterGroupOfSpansByThresholds(
            spansWithServerRequestIssueByGroup,
            SpansWithRequestIssue,
            issueThresholds.requetsThresholds
          );
        }
      });
    }
  });
  return { SpansWithQueryIssue, SpansWithRequestIssue };
}
