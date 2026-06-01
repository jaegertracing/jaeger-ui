// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import { Tag } from 'antd';
import _sortBy from 'lodash/sortBy';
import { IoAlert } from 'react-icons/io5';
import colorGenerator from '../../../utils/color-generator';
import type { TraceSummary } from '../../../types/trace-summary';
import './ServicePills.css';

export type ServiceEntry = TraceSummary['services'][number];

function ServicePill({ service }: { service: ServiceEntry }) {
  return (
    <Tag
      className="ServicePills--tag"
      style={{ borderLeftColor: colorGenerator.getColorByKey(service.name) }}
      variant="outlined"
    >
      {(service.errorSpanCount ?? 0) > 0 && <IoAlert className="ServicePills--errorIcon" />}
      {service.name} ({service.spanCount ?? '-'})
    </Tag>
  );
}

export { ServicePill };

export default function ServicePills({ services }: { services: TraceSummary['services'] }) {
  const sorted = _sortBy(services, s => s.name);
  return (
    <ul className="ub-list-reset">
      {sorted.map(service => (
        <li key={service.name} className="ub-inline-block ub-m1">
          <ServicePill service={service} />
        </li>
      ))}
    </ul>
  );
}
