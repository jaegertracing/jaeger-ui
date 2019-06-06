// Copyright (c) 2017 Uber Technologies, Inc.
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

import _identity from 'lodash/identity';
import queryString from 'query-string';
import { /* Action, ActionFunctionAny, */ createActions /* , handleActions */ } from 'redux-actions';

import { TMeta } from '../reducers/deep-dependency-graph';
import generateActionTypes from '../utils/generate-action-types';
// import guardReducer from '../../../utils/guardReducer';

// payloads
/*
export type TSpanIdLogValue = { logItem: Log; spanID: string };
export type TSpanIdValue = { spanID: string };
type TSpansValue = { spans: Span[] };
type TTraceUiFindValue = { trace: Trace; uiFind: string | TNil };
export type TWidthValue = { width: number };
export type TActionTypes =
  | TSpanIdLogValue
  | TSpanIdValue
  | TSpansValue
  | TTraceUiFindValue
  | TWidthValue
  | {};

type TTimelineViewerActions = {
  [actionName: string]: ActionFunctionAny<Action<TActionTypes>>;
};
 */

export type TAddStyle = { visibilityIndices: number[], style: number };
export type TClearStyle = { visibilityIndices?: number[], style?: number };
export type TActionTypes = TAddStyle | TClearStyle;

export const actionTypes = generateActionTypes('@jaeger-ui/DEEP-DEPENDENCY-GRAPH', [
  'ADD_STYLE_STATE',
  'CLEAR_STYLE_STATE',
  /*
  'ADD_HOVER_INDENT_GUIDE_ID',
  'CHILDREN_TOGGLE',
  'CLEAR_SHOULD_SCROLL_TO_FIRST_UI_FIND_MATCH',
  'COLLAPSE_ALL',
  'COLLAPSE_ONE',
  'DETAIL_TOGGLE',
  'DETAIL_TAGS_TOGGLE',
  'DETAIL_PROCESS_TOGGLE',
  'DETAIL_LOGS_TOGGLE',
  'DETAIL_LOG_ITEM_TOGGLE',
  'DETAIL_WARNINGS_TOGGLE',
  'EXPAND_ALL',
  'EXPAND_ONE',
  'FOCUS_UI_FIND_MATCHES',
  'REMOVE_HOVER_INDENT_GUIDE_ID',
  'SET_SPAN_NAME_COLUMN_WIDTH',
  'SET_TRACE',
   */
]);

const addStyleState: (kwarg: TAddStyle) => TAddStyle = _identity;
const clearStyleState: (kwarg: TClearStyle) => TClearStyle = _identity;

function unarrayify(arg: string | string[]): string {
  if(Array.isArray(arg)) {
    const returnVal = arg[0];
    console.warn(`Found multiple query parameters: "${arg}", using "${returnVal}"`); // eslint-disable-line no-console
    return returnVal;
  }
  return arg;
}

// TODO: Meta needs validation and warnings
export const extractMeta = (): TMeta => { 
  const { service, operation, start, end } = queryString.parse(window.location.search);
  if (service == null) {
    throw new Error('Service name unavailable when trying to change style state');
  }
  if (start == null) {
    throw new Error('Start time unavailable when trying to change style state');
  }
  if (end == null) {
    throw new Error('End time unavailable when trying to change style state');
  }
  return {
    query: {
      service: unarrayify(service),
      operation: operation && unarrayify(operation),
      start: Number.parseInt(unarrayify(start), 10),
      end: Number.parseInt(unarrayify(end), 10),
    },
  };
};

export const actions = createActions<TActionTypes, TMeta>({
  /*
  [actionTypes.ADD_STYLE_STATE]: [kwargPassthrough<TAddStyle>, extractMeta],
  [actionTypes.CLEAR_STYLE_STATE]: [kwargPassthrough<TClearStyle>, extractMeta],
   */
  /*
  [actionTypes.ADD_STYLE_STATE]: [_identity<TAddStyle>, extractMeta],
  [actionTypes.CLEAR_STYLE_STATE]: [_identity, extractMeta],
   */
  [actionTypes.ADD_STYLE_STATE]: [addStyleState, extractMeta],
  [actionTypes.CLEAR_STYLE_STATE]: [clearStyleState, extractMeta],
  /*
  [actionTypes.ADD_HOVER_INDENT_GUIDE_ID]: (spanID: string) => ({ spanID }),
  [actionTypes.CHILDREN_TOGGLE]: (spanID: string) => ({ spanID }),
  [actionTypes.CLEAR_SHOULD_SCROLL_TO_FIRST_UI_FIND_MATCH]: () => ({}),
  [actionTypes.COLLAPSE_ALL]: (spans: Span[]) => ({ spans }),
  [actionTypes.COLLAPSE_ONE]: (spans: Span[]) => ({ spans }),
  [actionTypes.DETAIL_LOG_ITEM_TOGGLE]: (spanID: string, logItem: Log) => ({ logItem, spanID }),
  [actionTypes.DETAIL_LOGS_TOGGLE]: (spanID: string) => ({ spanID }),
  [actionTypes.EXPAND_ALL]: () => ({}),
  [actionTypes.EXPAND_ONE]: (spans: Span[]) => ({ spans }),
  [actionTypes.DETAIL_PROCESS_TOGGLE]: (spanID: string) => ({ spanID }),
  [actionTypes.DETAIL_WARNINGS_TOGGLE]: (spanID: string) => ({ spanID }),
  [actionTypes.DETAIL_TAGS_TOGGLE]: (spanID: string) => ({ spanID }),
  [actionTypes.DETAIL_TOGGLE]: (spanID: string) => ({ spanID }),
  [actionTypes.FOCUS_UI_FIND_MATCHES]: (trace: Trace, uiFind: string | TNil) => ({ trace, uiFind }),
  [actionTypes.REMOVE_HOVER_INDENT_GUIDE_ID]: (spanID: string) => ({ spanID }),
  [actionTypes.SET_SPAN_NAME_COLUMN_WIDTH]: (width: number) => ({ width }),
  [actionTypes.SET_TRACE]: (trace: Trace, uiFind: string | TNil) => ({ trace, uiFind }),
   */
});

// export const actions = (fullActions as any).jaegerUi.traceTimelineViewer as TTimelineViewerActions;
// export const actions = fullActions;




/*
export default handleActions(
  {
    [actionTypes.ADD_HOVER_INDENT_GUIDE_ID]: guardReducer(addHoverIndentGuideId),
    [actionTypes.CHILDREN_TOGGLE]: guardReducer(childrenToggle),
    [actionTypes.CLEAR_SHOULD_SCROLL_TO_FIRST_UI_FIND_MATCH]: guardReducer(
      clearShouldScrollToFirstUiFindMatch
    ),
    [actionTypes.COLLAPSE_ALL]: guardReducer(collapseAll),
    [actionTypes.COLLAPSE_ONE]: guardReducer(collapseOne),
    [actionTypes.DETAIL_LOGS_TOGGLE]: guardReducer(detailLogsToggle),
    [actionTypes.DETAIL_LOG_ITEM_TOGGLE]: guardReducer(detailLogItemToggle),
    [actionTypes.DETAIL_PROCESS_TOGGLE]: guardReducer(detailProcessToggle),
    [actionTypes.DETAIL_WARNINGS_TOGGLE]: guardReducer(detailWarningsToggle),
    [actionTypes.DETAIL_TAGS_TOGGLE]: guardReducer(detailTagsToggle),
    [actionTypes.DETAIL_TOGGLE]: guardReducer(detailToggle),
    [actionTypes.EXPAND_ALL]: guardReducer(expandAll),
    [actionTypes.EXPAND_ONE]: guardReducer(expandOne),
    [actionTypes.FOCUS_UI_FIND_MATCHES]: guardReducer(focusUiFindMatches),
    [actionTypes.REMOVE_HOVER_INDENT_GUIDE_ID]: guardReducer(removeHoverIndentGuideId),
    [actionTypes.SET_SPAN_NAME_COLUMN_WIDTH]: guardReducer(setColumnWidth),
    [actionTypes.SET_TRACE]: guardReducer(setTrace),
  },
  newInitialState()
);
 */
