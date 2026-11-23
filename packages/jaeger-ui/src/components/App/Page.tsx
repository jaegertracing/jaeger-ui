// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import { Layout } from 'antd';
import cx from 'classnames';
import { useLocation } from 'react-router-dom';

import TopNav from './TopNav';
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

// The dock pulls in the assistant-ui and ag-ui libraries, so it loads as a separate
// chunk and only for deployments where the backend advertises the assistant. A chunk
// that fails to load, for example from a stale index.html after a deploy, must not
// take the page down with it, so the failure degrades to a page without the dock.
// The importer is a parameter so that tests can exercise the failure path.
export function loadJaegerAssistantDock(importer = () => import('./JaegerAssistantPanel')) {
  return importer().then(
    m => ({ default: m.JaegerAssistantDock }),
    (err: unknown) => {
      console.error('[jaeger-assistant] failed to load the assistant panel', err);
      return { default: () => null };
    }
  );
}

const JaegerAssistantDock = React.lazy(() => loadJaegerAssistantDock());

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

  React.useEffect(() => {
    trackPageView(pathname, search);
  }, [pathname, search]);

  const contentCls = cx({
    'Page--content': true,
    'Page--content--no-embedded': !embedded,
  });

  return (
    <div>
      <DocumentTitle title="Jaeger UI" />
      <Layout>
        {!embedded && (
          <Header className="Page--topNav">
            <TopNav />
          </Header>
        )}
        <Content className={contentCls}>
          {assistantEnvOn ? (
            <div className={cx('Page--assistantShell', assistantDockOpen && 'Page--assistantShell--open')}>
              <div className="Page--assistantMain">{children}</div>
              <React.Suspense fallback={null}>
                <JaegerAssistantDock />
              </React.Suspense>
            </div>
          ) : (
            children
          )}
        </Content>
      </Layout>
    </div>
  );
};
