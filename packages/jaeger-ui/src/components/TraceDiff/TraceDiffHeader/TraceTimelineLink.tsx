// Copyright (c) 2019 Uber Technologies, Inc.
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
  return (
    <a
      href={getUrl(traceID)}
      onClick={stopPropagation}
      rel="noopener noreferrer"
      target={getTargetEmptyOrBlank()}
    >
      <NewWindowIcon />
    </a>
  );
}
