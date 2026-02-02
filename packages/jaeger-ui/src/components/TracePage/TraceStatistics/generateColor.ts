// Copyright (c) 2020 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { ITableSpan } from './types';

export default function generateColor(tableValue: ITableSpan[], attribute: string, colorToPercent: boolean) {
  let color;
  let colorString;
  const tableValue2 = tableValue;

  for (let i = 0; i < tableValue2.length; i++) {
    if (colorToPercent) {
      if (attribute === 'percent') {
        const factor = tableValue2[i].percent / 100;
        const alpha = Math.round(factor * 0.8 * 1000) / 1000;
        colorString = `rgba(255, 77, 79, ${alpha})`;
        tableValue2[i].colorToPercent = colorString;
      } else {
        let max = 0;
        // find highest value
        for (let j = 0; j < tableValue2.length; j++) {
          if (max < (tableValue2[j] as any)[attribute]) {
            max = (tableValue2[j] as any)[attribute];
          }
        }
        const factor = (tableValue2[i] as any)[attribute] / (max || 1);
        const alpha = Math.round(factor * 0.8 * 1000) / 1000;
        colorString = `rgba(255, 77, 79, ${alpha})`;
        tableValue2[i].colorToPercent = colorString;
      }
    } else {
      tableValue2[i].colorToPercent = 'transparent';
    }
  }
  return tableValue2;
}
