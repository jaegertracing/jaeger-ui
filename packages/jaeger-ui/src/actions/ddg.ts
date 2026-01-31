// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import _identity from 'lodash/identity';
import { createActions, ActionFunctionAny, Action } from 'redux-actions';

import {
  TDdgAddViewModifierPayload,
  TDdgClearViewModifiersFromIndicesPayload,
  TDdgRemoveViewModifierFromIndicesPayload,
  TDdgRemoveViewModifierPayload,
  TDdgViewModifierRemovalPayload,
} from '../model/ddg/types';
import generateActionTypes from '../utils/generate-action-types';

export const actionTypes = generateActionTypes('@jaeger-ui/DEEP-DEPENDENCY-GRAPH', [
  'ADD_VIEW_MODIFIER',
  'CLEAR_VIEW_MODIFIERS_FROM_INDICES',
  'REMOVE_VIEW_MODIFIER',
  'REMOVE_VIEW_MODIFIER_FROM_INDICES',
]);

const addViewModifier: (kwarg: TDdgAddViewModifierPayload) => TDdgAddViewModifierPayload = _identity;
const clearViewModifiersFromIndices: (
  kwarg: TDdgClearViewModifiersFromIndicesPayload
) => TDdgClearViewModifiersFromIndicesPayload = _identity;
const removeViewModifier: (kwarg: TDdgRemoveViewModifierPayload) => TDdgRemoveViewModifierPayload = _identity;
const removeViewModifierFromIndices: (
  kwarg: TDdgRemoveViewModifierFromIndicesPayload
) => TDdgRemoveViewModifierFromIndicesPayload = _identity;

const fullActions = createActions<TDdgAddViewModifierPayload | TDdgViewModifierRemovalPayload>({
  [actionTypes.ADD_VIEW_MODIFIER]: addViewModifier,
  [actionTypes.CLEAR_VIEW_MODIFIERS_FROM_INDICES]: clearViewModifiersFromIndices,
  [actionTypes.REMOVE_VIEW_MODIFIER]: removeViewModifier,
  [actionTypes.REMOVE_VIEW_MODIFIER_FROM_INDICES]: removeViewModifierFromIndices,
});

type FullActionsType = {
  jaegerUi: {
    deepDependencyGraph: Record<string, ActionFunctionAny<Action<TDdgViewModifierRemovalPayload>>>;
  };
};

export default (fullActions as unknown as FullActionsType).jaegerUi.deepDependencyGraph;
