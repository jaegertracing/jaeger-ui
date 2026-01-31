// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import { OPEN } from '../../../utils/tracking/common';
import { trackEvent } from '../../../utils/tracking';

const CATEGORY = 'jaeger/ux/trace/kbd-modal';

export default trackEvent.bind(null, CATEGORY, OPEN);
