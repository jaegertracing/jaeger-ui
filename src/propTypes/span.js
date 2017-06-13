import PropTypes from 'prop-types';

export default PropTypes.shape({
  duration: PropTypes.number,
  spanID: PropTypes.string,
  startTime: PropTypes.number,
  traceID: PropTypes.string,
  references: PropTypes.array,
});
