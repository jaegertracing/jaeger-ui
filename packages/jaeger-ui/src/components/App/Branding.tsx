// Copyright (c) 2026 Jaeger Authors
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { Link } from 'react-router-dom';
import prefixUrl from '../../utils/prefix-url';
import JaegerLogo from '../../img/jaeger-logo.svg';

import './Branding.css';

const Branding: React.FC = () => (
  <Link to={prefixUrl('/')} className="Branding">
    <img src={JaegerLogo} alt="Jaeger Logo" className="Branding--logo" />
    <span className="Branding--name">Jaeger</span>
  </Link>
);

export default Branding;
