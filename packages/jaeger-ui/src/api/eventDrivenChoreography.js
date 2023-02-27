import fetch from 'isomorphic-fetch';


export function getMessageFromError(errData, status) {
  if (errData.code != null && errData.msg != null) {
    if (errData.code === status) {
      return errData.msg;
    }
    return `${errData.code} - ${errData.msg}`;
  }
  try {
    return JSON.stringify(errData);
  } catch (_) {
    return String(errData);
  }
}

function sendTraceData(traceData) {
  const url = 'http://localhost:8090/api/algorithm'; // const url = 'http://localhost:8090/api/get-events-from-trace';
  const options = {
    method: 'POST',
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(traceData)
  };

  return fetch(url, options)
    .then(response => {
      if (response.ok) {
        return response.json();
      }
      throw new Error(`HTTP Error: ${response.status} - ${response.statusText}`);
    })
    .catch(error => {
      console.error(error);
    });
}


export const EVENT_DRIVEN_CHOREOGRAPHY_DIAGRAM_BACKEND_ROOT = 'http://localhost:8090/api/';

const EventDrivenChoreographyAPI = {
  apiRoot: EVENT_DRIVEN_CHOREOGRAPHY_DIAGRAM_BACKEND_ROOT,
  generateBPMNChoreographyAndEventSagaInformationFromTrace(traceData) {
    return sendTraceData(traceData)
  }
};

export default EventDrivenChoreographyAPI;