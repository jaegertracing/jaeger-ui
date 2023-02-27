import React, { useEffect }   from 'react';
import PropTypes from 'prop-types';
import './index.css';
import EventAccordion from './EventAccordion';


const Topic = ({ topic }) => {

  return (
    <tr className="tr--Topic">
      <td className="td--Topic">{topic.topicName}</td>
      <td>
        <ul className="ul--Topic">
          {topic.consumers.map(consumers => (
            <li key={consumers} className="li--Topic">{consumers}</li>
          ))}
        </ul>
      </td>
      <td>
        <ul className="ul--Topic">
          {topic.producers.map(producer => (
            <li key={producer} className="li--Topic">{producer}</li>
          ))}
        </ul>
      </td>
      <td>
        <ul className="ul--Topic">
          {topic.events.map(event => (
            <li key={event} className="li--Topic">
              <EventAccordion data={event} />
            </li>
          ))}
        </ul>
      </td>
    </tr>
  );
};

const Topics = ({ topicsInfo }) => {

  return (
    <table className="table--Topics">
      <thead className="thead--Topics">
      <tr>
        <th className="th-Topics">Topic</th>
        <th className="th-Topics">Consumers</th>
        <th className="th-Topics">Producers</th>
        <th className="th-Topics">Events</th>
      </tr>
      </thead>
      <tbody>
      {topicsInfo.map(topic => (
        <Topic key={topicsInfo.topicName} topic={topic} />
      ))}
      </tbody>
    </table>
  );
};

Topic.propTypes = {
  topic: PropTypes.shape({
    topicName: PropTypes.string.isRequired,
    consumers: PropTypes.arrayOf(PropTypes.string).isRequired,
    producers: PropTypes.arrayOf(PropTypes.string).isRequired,
    events: PropTypes.arrayOf(
      PropTypes.shape({
        eventTime: PropTypes.string.isRequired,
        eventType: PropTypes.string.isRequired,
        eventSource: PropTypes.string.isRequired,
        eventPayload: PropTypes.string.isRequired
      })
    ).isRequired
  }).isRequired
};

Topics.propTypes = {
  topicsInfo: PropTypes.arrayOf(Topic.propTypes.topic).isRequired
};

export default Topics;