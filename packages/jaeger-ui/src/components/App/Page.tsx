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

type TAssistantDockImporter = () => Promise<{ JaegerAssistantDock: React.ComponentType }>;

type TProps = {
  children?: React.ReactNode;
  assistantDockImporter?: TAssistantDockImporter;
};

const { Header, Content } = Layout;

type TAssistantLoadFailureProps = {
  onRetry?: () => void;
};

function JaegerAssistantLoadFailure({ onRetry }: TAssistantLoadFailureProps = {}) {
  const assistant = useJaegerAssistantOptional();
  const assistantConfigured = useJaegerAssistantConfigured();

  if (!assistant || !assistantConfigured) {
    return null;
  }

  return (
    <aside
      className="Page--assistantLoadFailure"
      aria-label="Ask Jaeger assistant"
      aria-hidden={!assistant.panelOpen}
      style={{ display: assistant.panelOpen ? undefined : 'none' }}
    >
      <div className="Page--assistantLoadFailureNotice">
        <p>The assistant failed to load. Reload the page to try again.</p>
        {onRetry && (
          <button type="button" className="Page--assistantLoadFailureRetry" onClick={onRetry}>
            Retry
          </button>
        )}
      </div>
    </aside>
  );
}

// The dock pulls in the assistant-ui and ag-ui libraries, so it loads as a separate
// chunk and only for deployments where the backend advertises the assistant. A chunk
// that fails to load, for example from a stale index.html after a deploy or a transient
// network error, displays an error notice in the assistant dock with a retry option.
// The importer is a parameter so that tests can exercise the failure path.
export function loadJaegerAssistantDock(
  importer: TAssistantDockImporter = () => import('./JaegerAssistantPanel'),
  onRetry?: () => void
) {
  return importer().then(
    m => ({ default: m.JaegerAssistantDock }),
    (err: unknown) => {
      console.error('[jaeger-assistant] failed to load the assistant panel', err);
      return { default: () => <JaegerAssistantLoadFailure onRetry={onRetry} /> };
    }
  );
}

function JaegerAssistantLazyDock({
  assistantDockImporter,
  onRetry,
}: {
  assistantDockImporter?: TAssistantDockImporter;
  onRetry: () => void;
}) {
  const LazyDock = React.useMemo(
    () => React.lazy(() => loadJaegerAssistantDock(assistantDockImporter, onRetry)),
    [assistantDockImporter, onRetry]
  );
  return <LazyDock />;
}

// export for tests
export const PageImpl: React.FC<TProps> = props => {
  const embedded = useEmbeddedState();
  const { children, assistantDockImporter } = props;
  const { pathname, search } = useLocation();
  const assistant = useJaegerAssistantOptional();
  const assistantConfigured = useJaegerAssistantConfigured();
  const assistantPanelOpen = Boolean(assistant?.panelOpen);
  const assistantEnvOn = !embedded && assistantConfigured;
  const assistantDockOpen = assistantEnvOn && assistantPanelOpen;

  const [dockRetryKey, setDockRetryKey] = React.useState(0);
  const handleDockRetry = React.useCallback(() => {
    setDockRetryKey(k => k + 1);
  }, []);

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
                <JaegerAssistantLazyDock
                  key={dockRetryKey}
                  assistantDockImporter={assistantDockImporter}
                  onRetry={handleDockRetry}
                />
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
