// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import dayjs from 'dayjs';

import { formatRelativeDate } from '../../utils/date';

type Props = {
  fullMonthName: boolean | undefined | null;
  includeTime: boolean | undefined | null;
  value: number | Date;
};

export default function RelativeDate(props: Props): string {
  const { value, includeTime, fullMonthName } = props;
  const m = dayjs.isDayjs(value) ? value : dayjs(value);
  const dateStr = formatRelativeDate(m, Boolean(fullMonthName));
  const timeStr = includeTime ? `, ${m.format('h:mm:ss a')}` : '';
  return `${dateStr}${timeStr}`;
}
