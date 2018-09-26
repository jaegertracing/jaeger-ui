import React, {Component} from 'react'
import {render} from 'react-dom'

import { TimelineRow } from '../../src'

class Demo extends Component {
  render() {
    return <div>
      <h1>ui-kit Demo</h1>
      <TimelineRow className="TimelineHeaderRow">
        <TimelineRow.Cell width={200}>
          <h3 className="TimelineHeaderRow--title">Service &amp; Operation</h3>
        </TimelineRow.Cell>
      </TimelineRow>
    </div>
  }
}

render(<Demo/>, document.querySelector('#demo'))
