// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import prefixUrl from '../../utils/prefix-url';
import {
  IoServer,
  IoPaperPlane,
  IoSwapHorizontal,
  IoGlobeOutline,
  IoHardwareChip,
  IoCloud,
  IoShieldCheckmark,
  IoTerminal,
  IoSettings,
  IoSearch,
  IoCodeWorking,
  IoBug,
  IoCube,
  IoFlash,
} from 'react-icons/io5';

import { DiRedis } from 'react-icons/di';
import { FaDatabase } from 'react-icons/fa';

import {
  SiPostgresql,
  SiMysql,
  SiMongodb,
  SiApachekafka,
  SiRabbitmq,
  SiKubernetes,
  SiGo,
  SiPython,
  SiNodedotjs,
  SiGraphql,
  SiElasticsearch,
} from './SiIcons';

const ICON_MAP: Record<string, React.ElementType> = {
  // Formal built-in tokens
  'io.Server': IoServer,
  'io.PaperPlane': IoPaperPlane,
  'io.Swap': IoSwapHorizontal,
  'io.Globe': IoGlobeOutline,
  'io.HardwareChip': IoHardwareChip,
  'io.Cloud': IoCloud,
  'io.Database': FaDatabase,
  'io.Shield': IoShieldCheckmark,
  'io.Terminal': IoTerminal,
  'io.Settings': IoSettings,
  'io.Search': IoSearch,
  'io.Code': IoCodeWorking,
  'io.Bug': IoBug,
  'io.Cube': IoCube,
  'io.Flash': IoFlash,

  // Tool-specific tokens
  'di.Redis': DiRedis,
  'si.Postgresql': SiPostgresql,
  'si.Mysql': SiMysql,
  'si.Mongodb': SiMongodb,
  'si.Apachekafka': SiApachekafka,
  'si.Rabbitmq': SiRabbitmq,
  'si.Kubernetes': SiKubernetes,
  'si.Go': SiGo,
  'si.Python': SiPython,
  'si.Nodedotjs': SiNodedotjs,
  'si.Graphql': SiGraphql,
  'si.Elasticsearch': SiElasticsearch,
};

type Props = {
  icon: string;
  className?: string;
  tooltip?: string;
};

const IconProvider: React.FC<Props> = ({ icon, className, tooltip }) => {
  // 1. Check for image URL
  if (icon.startsWith('http://') || icon.startsWith('https://') || icon.startsWith('/')) {
    const ariaProps = tooltip ? { alt: tooltip } : { alt: '', 'aria-hidden': true };
    const resolvedIcon = icon.startsWith('/') ? prefixUrl(icon) : icon;
    return (
      <img
        src={resolvedIcon}
        className={className}
        title={tooltip}
        referrerPolicy="no-referrer"
        crossOrigin="anonymous"
        {...ariaProps}
      />
    );
  }

  // 2. Check built-in tokens
  const BuiltInIcon = ICON_MAP[icon];
  if (BuiltInIcon) {
    const ariaProps = tooltip ? { role: 'img', 'aria-label': tooltip } : { 'aria-hidden': true };
    return <BuiltInIcon className={className} title={tooltip} {...ariaProps} />;
  }

  return null;
};

export default IconProvider;
