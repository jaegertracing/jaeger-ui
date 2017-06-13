import PropTypes from 'prop-types';

export default PropTypes.shape({
  timestamp: PropTypes.number,
  relativeTime: PropTypes.number,
  message: PropTypes.string,
  data: PropTypes.array,
});
