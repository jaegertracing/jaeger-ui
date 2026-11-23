// Copyright (c) 2019 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';

import { getUrl } from '../../TracePage/url';
import NewWindowIcon from '../../common/NewWindowIcon';
import { getTargetEmptyOrBlank } from '../../../utils/config/get-target';

type PropsType = {
  traceID: string;
};

function stopPropagation(event: React.MouseEvent<HTMLAnchorElement>) {
  event.stopPropagation();
}

export default function TraceTimelineLink({ traceID }: PropsType) {
  const target = getTargetEmptyOrBlank();
  const suffix = target === '_blank' ? ' in a new window' : '';
  return (
    <a
      aria-label={`Open trace${suffix}`}
      href={getUrl(traceID)}
      onClick={stopPropagation}
      rel="noopener noreferrer"
      target={target}
    >
      <NewWindowIcon />
    </a>
  );
}
