import React, { useEffect } from 'react';
import BPMNChoreographyDiagram from './BPMNChoreography/index';
import { Trace } from '../../../types/trace';
import './index.css';
import EventDrivenChoreographyAPI from '../../../api/eventDrivenChoreography';
import BPMNTest from './BPMNChoreography/index';
import Topics from './TopicsInfo/index';

const TraceAsEventDrivenBPMNChoreography = ({ trace }: any) => {

    const [response, setResponse] = React.useState<any>(null);
    const [bpmnChor, setBpmnChor] = React.useState<any>(null);
    const [topicsEventsInfo, setTopicsEventsInfo] = React.useState<any>(null);

    useEffect(() => {
      console.log('Executing request');
      const data = trace.data;
      EventDrivenChoreographyAPI.generateBPMNChoreographyAndEventSagaInformationFromTrace(data).then((res: { bpmnDefinitionsXml: String; topicsEventsInfo: any}) => {
        console.log('Setting bpmnChor');
        setTopicsEventsInfo(res.topicsEventsInfo);
        console.log('res.topicsEventsInfo');
        console.log(res.topicsEventsInfo);
        setBpmnChor(res.bpmnDefinitionsXml);
      }).catch((error: any) => {
        console.error(error);
      });
    }, []);

    return (
      <div className='container'>
        <h3 className='title--TraceAsTopicsInfoView'>Information</h3>
        {topicsEventsInfo && <Topics topicsInfo={topicsEventsInfo} />}
        <h3 className='title--TraceAsEventDrivenBPMNChoreographyView'>Trace As Event-Driven BPMN Choreography</h3>
        {bpmnChor && <BPMNChoreographyDiagram diagramAsXml={bpmnChor} />}
      </div>
    );
  }
;

export default TraceAsEventDrivenBPMNChoreography;