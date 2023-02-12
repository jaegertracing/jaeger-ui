import React, { useEffect, useState } from 'react';

import { Helmet } from 'react-helmet';

import NavigatedViewer from 'chor-js/lib/NavigatedViewer';

const emptyDiagram = '<?xml version="1.0" encoding="UTF-8"?>\n' +
  '<bpmn2:definitions xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:bpmn2="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" xmlns:xs="http://www.w3.org/2001/XMLSchema" id="_tTv5YOycEeiHGOQ2NkJZNQ" targetNamespace="http://bpmn.io/schema/bpmn">\n' +
  '    <bpmn2:message id="Message_1rnq4x3" name="pizza" />\n' +
  '    <bpmn2:message id="Message_1mi4idx" />\n' +
  '    <bpmn2:message id="Message_1pam53q" name="pizza order" />\n' +
  '    <bpmn2:choreography id="PizzaDelivery">\n' +
  '        <bpmn2:participant id="Participant_06qakjv" name="Customer" />\n' +
  '        <bpmn2:participant id="Participant_0mgz9si" name="Pizza Place" />\n' +
  '        <bpmn2:participant id="Participant_0537iz2" name="Delivery Boy" />\n' +
  '        <bpmn2:messageFlow id="MessageFlow_03drbju" sourceRef="Participant_0537iz2" targetRef="Participant_06qakjv" messageRef="Message_1rnq4x3" />\n' +
  '        <bpmn2:messageFlow id="MessageFlow_0dnembp" sourceRef="Participant_0mgz9si" targetRef="Participant_0537iz2" messageRef="Message_1mi4idx" />\n' +
  '        <bpmn2:messageFlow id="MessageFlow_0nzo41l" sourceRef="Participant_06qakjv" targetRef="Participant_0mgz9si" messageRef="Message_1pam53q" />\n' +
  '        <bpmn2:startEvent id="StartEvent_00yy9i8">\n' +
  '            <bpmn2:outgoing>SequenceFlow_0dy5er9</bpmn2:outgoing>\n' +
  '        </bpmn2:startEvent>\n' +
  '        <bpmn2:choreographyTask id="ChoreographyTask_0hy9n0g" name="order pizza" initiatingParticipantRef="Participant_06qakjv">\n' +
  '            <bpmn2:incoming>SequenceFlow_0dy5er9</bpmn2:incoming>\n' +
  '            <bpmn2:outgoing>SequenceFlow_036yo13</bpmn2:outgoing>\n' +
  '            <bpmn2:participantRef>Participant_06qakjv</bpmn2:participantRef>\n' +
  '            <bpmn2:participantRef>Participant_0mgz9si</bpmn2:participantRef>\n' +
  '            <bpmn2:messageFlowRef>MessageFlow_0nzo41l</bpmn2:messageFlowRef>\n' +
  '        </bpmn2:choreographyTask>\n' +
  '        <bpmn2:sequenceFlow id="SequenceFlow_0dy5er9" sourceRef="StartEvent_00yy9i8" targetRef="ChoreographyTask_0hy9n0g" />\n' +
  '        <bpmn2:choreographyTask id="ChoreographyTask_1m3qduh" name="hand over pizza" initiatingParticipantRef="Participant_0mgz9si">\n' +
  '            <bpmn2:incoming>SequenceFlow_036yo13</bpmn2:incoming>\n' +
  '            <bpmn2:outgoing>SequenceFlow_0esuuaj</bpmn2:outgoing>\n' +
  '            <bpmn2:participantRef>Participant_0mgz9si</bpmn2:participantRef>\n' +
  '            <bpmn2:participantRef>Participant_0537iz2</bpmn2:participantRef>\n' +
  '            <bpmn2:messageFlowRef>MessageFlow_0dnembp</bpmn2:messageFlowRef>\n' +
  '        </bpmn2:choreographyTask>\n' +
  '        <bpmn2:sequenceFlow id="SequenceFlow_036yo13" sourceRef="ChoreographyTask_0hy9n0g" targetRef="ChoreographyTask_1m3qduh" />\n' +
  '        <bpmn2:choreographyTask id="ChoreographyTask_175oxwe" name="deliver pizza" initiatingParticipantRef="Participant_0537iz2">\n' +
  '            <bpmn2:incoming>SequenceFlow_0esuuaj</bpmn2:incoming>\n' +
  '            <bpmn2:outgoing>SequenceFlow_0xamnn2</bpmn2:outgoing>\n' +
  '            <bpmn2:participantRef>Participant_0537iz2</bpmn2:participantRef>\n' +
  '            <bpmn2:participantRef>Participant_06qakjv</bpmn2:participantRef>\n' +
  '            <bpmn2:messageFlowRef>MessageFlow_03drbju</bpmn2:messageFlowRef>\n' +
  '        </bpmn2:choreographyTask>\n' +
  '        <bpmn2:sequenceFlow id="SequenceFlow_0esuuaj" sourceRef="ChoreographyTask_1m3qduh" targetRef="ChoreographyTask_175oxwe" />\n' +
  '        <bpmn2:endEvent id="EndEvent_1lv264w">\n' +
  '            <bpmn2:incoming>SequenceFlow_0xamnn2</bpmn2:incoming>\n' +
  '        </bpmn2:endEvent>\n' +
  '        <bpmn2:sequenceFlow id="SequenceFlow_0xamnn2" sourceRef="ChoreographyTask_175oxwe" targetRef="EndEvent_1lv264w" />\n' +
  '    </bpmn2:choreography>\n' +
  '    <bpmndi:BPMNDiagram id="BPMNDiagram_1">\n' +
  '        <bpmndi:BPMNPlane id="BPMNPlane_Choreography_1" bpmnElement="PizzaDelivery">\n' +
  '            <bpmndi:BPMNShape id="StartEvent_00yy9i8_di" bpmnElement="StartEvent_00yy9i8">\n' +
  '                <dc:Bounds x="234" y="350" width="36" height="36" />\n' +
  '            </bpmndi:BPMNShape>\n' +
  '            <bpmndi:BPMNShape id="ChoreographyTask_0hy9n0g_di" bpmnElement="ChoreographyTask_0hy9n0g">\n' +
  '                <dc:Bounds x="320" y="328" width="100" height="80" />\n' +
  '            </bpmndi:BPMNShape>\n' +
  '            <bpmndi:BPMNShape id="BPMNShape_1847k4t" bpmnElement="Participant_06qakjv" isMessageVisible="true" participantBandKind="top_initiating" choreographyActivityShape="ChoreographyTask_0hy9n0g_di">\n' +
  '                <dc:Bounds x="320" y="328" width="100" height="20" />\n' +
  '            </bpmndi:BPMNShape>\n' +
  '            <bpmndi:BPMNShape id="BPMNShape_0l74hmr" bpmnElement="Participant_0mgz9si" isMessageVisible="false" participantBandKind="bottom_non_initiating" choreographyActivityShape="ChoreographyTask_0hy9n0g_di">\n' +
  '                <dc:Bounds x="320" y="388" width="100" height="20" />\n' +
  '            </bpmndi:BPMNShape>\n' +
  '            <bpmndi:BPMNEdge id="SequenceFlow_0dy5er9_di" bpmnElement="SequenceFlow_0dy5er9">\n' +
  '                <di:waypoint x="270" y="368" />\n' +
  '                <di:waypoint x="319" y="368" />\n' +
  '            </bpmndi:BPMNEdge>\n' +
  '            <bpmndi:BPMNShape id="ChoreographyTask_1m3qduh_di" bpmnElement="ChoreographyTask_1m3qduh">\n' +
  '                <dc:Bounds x="470" y="328" width="100" height="80" />\n' +
  '            </bpmndi:BPMNShape>\n' +
  '            <bpmndi:BPMNShape id="BPMNShape_0jv15b8" bpmnElement="Participant_0mgz9si" isMessageVisible="false" participantBandKind="top_initiating" choreographyActivityShape="ChoreographyTask_1m3qduh_di">\n' +
  '                <dc:Bounds x="470" y="328" width="100" height="20" />\n' +
  '            </bpmndi:BPMNShape>\n' +
  '            <bpmndi:BPMNShape id="BPMNShape_03y5n7k" bpmnElement="Participant_0537iz2" isMessageVisible="false" participantBandKind="bottom_non_initiating" choreographyActivityShape="ChoreographyTask_1m3qduh_di">\n' +
  '                <dc:Bounds x="470" y="388" width="100" height="20" />\n' +
  '            </bpmndi:BPMNShape>\n' +
  '            <bpmndi:BPMNEdge id="SequenceFlow_036yo13_di" bpmnElement="SequenceFlow_036yo13">\n' +
  '                <di:waypoint x="421" y="368" />\n' +
  '                <di:waypoint x="469" y="368" />\n' +
  '            </bpmndi:BPMNEdge>\n' +
  '            <bpmndi:BPMNShape id="ChoreographyTask_175oxwe_di" bpmnElement="ChoreographyTask_175oxwe">\n' +
  '                <dc:Bounds x="620" y="328" width="100" height="80" />\n' +
  '            </bpmndi:BPMNShape>\n' +
  '            <bpmndi:BPMNShape id="BPMNShape_096dbw0" bpmnElement="Participant_0537iz2" isMessageVisible="true" participantBandKind="top_initiating" choreographyActivityShape="ChoreographyTask_175oxwe_di">\n' +
  '                <dc:Bounds x="620" y="328" width="100" height="20" />\n' +
  '            </bpmndi:BPMNShape>\n' +
  '            <bpmndi:BPMNShape id="BPMNShape_00bdfok" bpmnElement="Participant_06qakjv" isMessageVisible="false" participantBandKind="bottom_non_initiating" choreographyActivityShape="ChoreographyTask_175oxwe_di">\n' +
  '                <dc:Bounds x="620" y="388" width="100" height="20" />\n' +
  '            </bpmndi:BPMNShape>\n' +
  '            <bpmndi:BPMNEdge id="SequenceFlow_0esuuaj_di" bpmnElement="SequenceFlow_0esuuaj">\n' +
  '                <di:waypoint x="571" y="368" />\n' +
  '                <di:waypoint x="619" y="368" />\n' +
  '            </bpmndi:BPMNEdge>\n' +
  '            <bpmndi:BPMNShape id="EndEvent_1lv264w_di" bpmnElement="EndEvent_1lv264w">\n' +
  '                <dc:Bounds x="770" y="350" width="36" height="36" />\n' +
  '            </bpmndi:BPMNShape>\n' +
  '            <bpmndi:BPMNEdge id="SequenceFlow_0xamnn2_di" bpmnElement="SequenceFlow_0xamnn2">\n' +
  '                <di:waypoint x="721" y="368" />\n' +
  '                <di:waypoint x="770" y="368" />\n' +
  '            </bpmndi:BPMNEdge>\n' +
  '        </bpmndi:BPMNPlane>\n' +
  '        <bpmndi:BPMNLabelStyle id="BPMNLabelStyle_1">\n' +
  '            <dc:Font name="arial" size="9" />\n' +
  '        </bpmndi:BPMNLabelStyle>\n' +
  '    </bpmndi:BPMNDiagram>\n' +
  '</bpmn2:definitions>\n';


const BPMNChoreography = () => {

  const [blankDiagram, setBlankDiagram] = useState(null);

  useEffect(() => {
    console.log('BPMN Choreography UseEffect');
    
    
    
    
    setBlankDiagram(emptyDiagram);
    const viewer = new NavigatedViewer({
      container: '#canvas',
      // remove the properties' panel if you use the Viewer
      // or NavigatedViewer modules of chor-js
    });
    console.log('Diagram:');
    console.log(blankDiagram);
    viewer.importXML(emptyDiagram);
    console.log("svg:")
    const resultSVG = viewer.saveSVG().then(result => {
      console.log(result)
    })
    console.log(`from: ${resultSVG}`)
  }, []);

  return (
    <div style={{ height: '100%'}}>
      <Helmet>
        <link rel='icon' href='favicon.ico' />
        <link rel='stylesheet' type='text/css' href='styles/style.css' />
      </Helmet>
      BPMN Choreography Diagram
      <div className='content' style={{ height: '100%'}}>
        <div id='canvas' style={{ height: '700px' }} />
      </div>
    </div>
  );
};

export default BPMNChoreography;