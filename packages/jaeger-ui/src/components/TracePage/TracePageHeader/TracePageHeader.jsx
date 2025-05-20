// This is a partial implementation focusing on the Archive button component

import React from 'react';
import { Button, Tooltip, message } from 'antd';
import { DownOutlined } from '@ant-design/icons';
import { connect } from 'react-redux';

import * as jaegerApiActions from '../../../actions/jaeger-api';
import { getArchivedEnabled } from '../../../utils/config/get-config';

export class TracePageHeaderFn extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      archiveInProgress: false,
    };
  }

  archiveTrace = () => {
    const { id, archiveTrace } = this.props;
    this.setState({ archiveInProgress: true });
    
    // Check if using in-memory storage
    const isInMemoryStorage = this.props.storage && this.props.storage.type === 'memory';
    
    if (isInMemoryStorage) {
      // Show warning toast for in-memory storage
      message.warning(
        'Warning: You are archiving to in-memory storage. Archived traces will be lost when Jaeger restarts.',
        5
      );
    }
    
    archiveTrace(id)
      .then(() => {
        this.setState({ archiveInProgress: false });
        message.success('This trace has been archived');
      })
      .catch(error => {
        this.setState({ archiveInProgress: false });
        message.error(`Unable to archive trace: ${error.message}`);
      });
  };

  render() {
    const { archiveEnabled, ...otherProps } = this.props;
    const { archiveInProgress } = this.state;
    
    return (
      <div className="TracePageHeader">
        {/* Other header components */}
        
        {archiveEnabled && (
          <Tooltip
            title="Archive this trace for long-term storage"
            placement="bottom"
          >
            <Button
              className="ArchiveButton"
              disabled={archiveInProgress}
              onClick={this.archiveTrace}
              loading={archiveInProgress}
            >
              Archive Trace <DownOutlined />
            </Button>
          </Tooltip>
        )}
        
        {/* Other UI elements */}
      </div>
    );
  }
}

// mapStateToProps function
function mapStateToProps(state, ownProps) {
  const { config, router } = state;
  const { capabilities } = router.location.state || {};
  
  // Use getArchivedEnabled to determine if archive button should be shown
  // This properly handles in-memory storage case
  const archiveEnabled = getArchivedEnabled(config, capabilities);
  
  return {
    ...ownProps,
    archiveEnabled,
    storage: config.storage,
  };
}

// mapDispatchToProps function
function mapDispatchToProps(dispatch) {
  return {
    archiveTrace: id => dispatch(jaegerApiActions.archiveTrace(id)),
  };
}

export default connect(mapStateToProps, mapDispatchToProps)(TracePageHeaderFn);
