import PropTypes from 'prop-types';

export default PropTypes.shape({
  comparator: PropTypes.func.isRequired,
  label: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  render: PropTypes.func.isRequired,
  selector: PropTypes.func.isRequired,
  defaultDir: PropTypes.number,
});
