import fetch from 'isomorphic-fetch';
import queryString from 'query-string';


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

function getJSON(url, options = {}) {
  const { query = null, ...init } = options;
  init.credentials = 'same-origin';
  let queryStr = '';

  if (query) {
    queryStr = `?${typeof query === 'string' ? query : queryString.stringify(query)}`;
  }

  return fetch(`${url}${queryStr}`, init).then(response => {
    if (response.status < 400) {
      return response.json();
    }
    return response.text().then(bodyText => {
      let data;
      let bodyTextFmt;
      let errorMessage;
      try {
        data = JSON.parse(bodyText);
        bodyTextFmt = JSON.stringify(data, null, 2);
      } catch (_) {
        data = null;
        bodyTextFmt = null;
      }
      if (data && Array.isArray(data.errors) && data.errors.length) {
        errorMessage = data.errors.map(err => getMessageFromError(err, response.status)).join('; ');
      } else {
        errorMessage = bodyText || `${response.status} - ${response.statusText}`;
      }
      if (typeof errorMessage === 'string') {
        errorMessage = errorMessage.trim();
      }
      const error = new Error(`HTTP Error: ${errorMessage}`);
      error.httpStatus = response.status;
      error.httpStatusText = response.statusText;
      error.httpBody = bodyTextFmt || bodyText;
      error.httpUrl = url;
      error.httpQuery = typeof query === 'string' ? query : queryString.stringify(query);
      throw error;
    });
  });
}

function sendTraceData(traceData) {
  const url = 'http://localhost:8090/api/print-body'; // const url = 'http://localhost:8090/api/get-events-from-trace';
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
  },
  generateBPMNChoreographyAndEventSagaInformationFromTrace2(traceData) {
    console.log(`Sending POST-REQ with ${traceData}`);
    const options = {
      method: 'POST',
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(traceData),
    };
    return getJSON(`${this.apiRoot}get-events-from-trace`, options);
  },
};

export default EventDrivenChoreographyAPI;