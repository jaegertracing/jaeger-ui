// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';

import DraggableManager from './DraggableManager';
import EUpdateTypes from './EUpdateTypes';
import { TNil } from '../../types';

export type DraggableBounds = {
  clientXLeft: number;
  maxValue?: number;
  minValue?: number;
  width: number;
};

export type DraggableSyntheticEvent = React.MouseEvent<HTMLElement | SVGElement, MouseEvent>;

export type DraggingUpdate = {
  event: DraggableSyntheticEvent | MouseEvent;
  manager: DraggableManager;
  tag: string | TNil;
  type: EUpdateTypes;
  value: number;
  x: number;
};
