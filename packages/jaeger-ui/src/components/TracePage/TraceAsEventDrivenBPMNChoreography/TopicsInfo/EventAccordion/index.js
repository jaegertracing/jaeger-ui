import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import './index.css';

const EventAccordion = ({ data }) => {
  const [open, setOpen] = useState(false);
  const [json, setJson] = useState(null);

  useEffect(() => {
    const jsonData = JSON.parse(data);
    setJson(jsonData);
  }, [data]);

  return (
    <div>
      <button onClick={() => setOpen(!open)} type="button" className="button--EventAccordion">
        {json && json.type}
      </button>
      {open && json && (
        <table className="table--EventTable">
          <tbody>
          {Object.entries(json).map(([key, value]) => (
            <tr key={key} className="tr--EventAccordion">
              <td>{key}</td>
              <td>{JSON.stringify(value)}</td>
            </tr>
          ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

EventAccordion.propTypes = {
  data: PropTypes.shape({
    type: PropTypes.string.isRequired,
  }).isRequired,
};

export default EventAccordion;