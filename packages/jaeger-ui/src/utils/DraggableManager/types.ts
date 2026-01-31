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

export type DraggingUpdate = {
  event: React.MouseEvent<HTMLDivElement | SVGSVGElement, MouseEvent> | MouseEvent;
  manager: DraggableManager;
  tag: string | TNil;
  type: EUpdateTypes;
  value: number;
  x: number;
};
