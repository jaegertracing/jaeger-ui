import PropTypes from 'prop-types';

import spanPropTypes from './span';

export default PropTypes.shape({
  spans: PropTypes.arrayOf(spanPropTypes),
});
