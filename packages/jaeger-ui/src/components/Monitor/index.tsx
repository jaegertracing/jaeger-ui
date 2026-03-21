// Copyright (c) 2021 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import MonitorATMServicesView from './ServicesView';
import MonitorATMEmptyState from './EmptyState';
import getConfig from '../../utils/config/get-config';

const MonitorATMPage = () =>
  getConfig().storageCapabilities?.metricsStorage ? <MonitorATMServicesView /> : <MonitorATMEmptyState />;

export default MonitorATMPage;
