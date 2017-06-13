import PropTypes from 'prop-types';

export const nodesPropTypes = PropTypes.arrayOf(
  PropTypes.shape({
    id: PropTypes.string.isRequired,
    radius: PropTypes.number.isRequired,
  })
);

export const linksPropTypes = PropTypes.arrayOf(
  PropTypes.shape({
    source: PropTypes.string.isRequired,
    target: PropTypes.string.isRequired,
    value: PropTypes.number.isRequired,
  })
);
