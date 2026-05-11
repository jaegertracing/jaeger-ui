// Copyright (c) 2024 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
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

const ICON_MAP: Record<string, React.ElementType> = {
  // Legacy aliases (for backward compatibility with the first version of PR)
  IoServer,
  IoPaperPlane,
  IoSwapHorizontal,
  IoGlobeOutline,
  IoHardwareChip,

  // Formal built-in tokens
  'io.Server': IoServer,
  'io.PaperPlane': IoPaperPlane,
  'io.Swap': IoSwapHorizontal,
  'io.Globe': IoGlobeOutline,
  'io.HardwareChip': IoHardwareChip,
  'io.Cloud': IoCloud,
  'io.Database': IoServer, // Fallback to Server if Database is missing in this version
  'io.Shield': IoShieldCheckmark,
  'io.Terminal': IoTerminal,
  'io.Settings': IoSettings,
  'io.Search': IoSearch,
  'io.Code': IoCodeWorking,
  'io.Bug': IoBug,
  'io.Cube': IoCube,
  'io.Flash': IoFlash,
};

type Props = {
  icon: string;
  className?: string;
  tooltip?: string;
};

const IconProvider: React.FC<Props> = ({ icon, className, tooltip }) => {
  // 1. Check built-in tokens
  const BuiltInIcon = ICON_MAP[icon];
  if (BuiltInIcon) {
    return <BuiltInIcon className={className} title={tooltip} />;
  }

  // 2. Check for image URL
  if (icon.startsWith('http://') || icon.startsWith('https://') || icon.startsWith('/')) {
    return <img src={icon} className={className} alt={tooltip || 'decoration'} title={tooltip} />;
  }

  // 3. Check for SVG string
  if (icon.trim().startsWith('<svg')) {
    return (
      <div
        className={className}
        title={tooltip}
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: icon }}
        style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
      />
    );
  }

  return null;
};

export default IconProvider;
