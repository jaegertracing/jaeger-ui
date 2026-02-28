// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import dayjs from 'dayjs';

import { formatRelativeDate } from '../../utils/date';
import { getTimeFormatWithSeconds } from '../../utils/time-format';

type Props = {
  fullMonthName: boolean | undefined | null;
  includeTime: boolean | undefined | null;
  value: number | Date;
};

// TODO typescript doesn't understand text or null as react nodes
// https://github.com/Microsoft/TypeScript/issues/21699
export default function RelativeDate(props: Props): React.JSX.Element {
  const { value, includeTime, fullMonthName } = props;
  const m = dayjs.isDayjs(value) ? value : dayjs(value);
  const dateStr = formatRelativeDate(m, Boolean(fullMonthName));
  const timeStr = includeTime ? `, ${m.format(getTimeFormatWithSeconds())}` : '';
  return <span>{`${dateStr}${timeStr}`}</span>;
}
