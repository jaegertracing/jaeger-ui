import React, { useEffect } from 'react';
import EventSagaTable from './EventSagaTable/index';
import BPMNChoreographyDiagram from './BPMNChoreography/index';
import { Trace } from '../../../types/trace';
import './index.css';
import EventDrivenChoreographyAPI from '../../../api/eventDrivenChoreography';
import BPMNTest from './BPMNChoreography/index';


const TraceAsEventDrivenBPMNChoreography = ({ trace }: any) => {

  const x = false;

  useEffect(() => {
    console.log('Test');
    console.log(JSON.stringify(trace.data));
    const data = trace.data;
    console.log(data);
    EventDrivenChoreographyAPI.generateBPMNChoreographyAndEventSagaInformationFromTrace(data);
  }, []);

  return (
    <div className='container'>
      <h3 className='title--TraceAsEventDrivenBPMNChoreographyView'>Trace As Event-Driven BPMN Choreography</h3>
      <BPMNChoreographyDiagram />
      {x ? <EventSagaTable trace={trace} /> : null}
    </div>
  );
};

export default TraceAsEventDrivenBPMNChoreography;