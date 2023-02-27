import React, { useEffect } from 'react';
import "./index.css";

import { Helmet } from 'react-helmet';

import NavigatedViewer from 'chor-js/lib/NavigatedViewer';

import PropTypes from 'prop-types';


const BPMNChoreography = ({diagramAsXml}) => {

  useEffect(() => {
    console.log('BPMN Choreography UseEffect');
    const viewer = new NavigatedViewer({
      container: '#canvas',
    });
    console.log('Diagram:');
    console.log(diagramAsXml);
    viewer.importXML(diagramAsXml);
  }, []);

  return (
    <div style={{ height: '100%'}}>
      <Helmet>
        <link rel='icon' href='favicon.ico' />
        <link rel='stylesheet' type='text/css' href='styles/style.css' />
      </Helmet>
      <div className='bpmn-chor-container'>
        <div className='content' style={{ height: '100%'}}>
          <div id='canvas' style={{ height: '700px' }} />
        </div>
      </div>
    </div>
  );
};

BPMNChoreography.propTypes = {
  diagramAsXml: PropTypes.string.isRequired,
};

export default BPMNChoreography;