// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import { Layout } from 'antd';
import cx from 'classnames';
import { useLocation } from 'react-router-dom';

import TopNav from './TopNav';
import { JaegerAssistantDock } from './JaegerAssistantPanel';
import { useJaegerAssistantOptional } from './JaegerAssistantContext';
import { useJaegerAssistantConfigured } from '../../hooks/useJaegerAssistant';
import { useEmbeddedState } from '../../stores/embedded-store';
import { trackPageView } from '../../utils/tracking';
import DocumentTitle from '../../utils/documentTitle';

import './Page.css';

type TProps = {
  children: React.ReactNode;
};

const { Header, Content } = Layout;

// export for tests
export const PageImpl: React.FC<TProps> = props => {
  const embedded = useEmbeddedState();
  const { children } = props;
  const { pathname, search } = useLocation();
  const assistant = useJaegerAssistantOptional();
  const assistantConfigured = useJaegerAssistantConfigured();
  const assistantPanelOpen = Boolean(assistant?.panelOpen);
  const assistantEnvOn = !embedded && assistantConfigured;
  const assistantDockOpen = assistantEnvOn && assistantPanelOpen;
  const pageRef = React.useRef<HTMLDivElement | null>(null);
  const headerRef = React.useRef<HTMLElement | null>(null);

  React.useEffect(() => {
    trackPageView(pathname, search);
  }, [pathname, search]);

  React.useLayoutEffect(() => {
    if (embedded) {
      pageRef.current?.style.removeProperty('--nav-height');
      return undefined;
    }

    const header = headerRef.current;
    if (!header) return undefined;

    const updateNavHeight = () => {
      const height = Math.ceil(header.getBoundingClientRect().height);
      if (height > 0) {
        pageRef.current?.style.setProperty('--nav-height', `${height}px`);
      }
    };

    updateNavHeight();

    if (typeof ResizeObserver === 'function') {
      const observer = new ResizeObserver(updateNavHeight);
      observer.observe(header);
      return () => observer.disconnect();
    }

    window.addEventListener('resize', updateNavHeight);
    return () => window.removeEventListener('resize', updateNavHeight);
  }, [embedded]);

  const contentCls = cx({
    'Page--content': true,
    'Page--content--no-embedded': !embedded,
  });

  return (
    <div ref={pageRef}>
      <DocumentTitle title="Jaeger UI" />
      <Layout>
        {!embedded && (
          <Header className="Page--topNav" ref={headerRef}>
            <TopNav />
          </Header>
        )}
        <Content className={contentCls}>
          {assistantEnvOn ? (
            <div className={cx('Page--assistantShell', assistantDockOpen && 'Page--assistantShell--open')}>
              <div className="Page--assistantMain">{children}</div>
              <JaegerAssistantDock />
            </div>
          ) : (
            children
          )}
        </Content>
      </Layout>
    </div>
  );
};
