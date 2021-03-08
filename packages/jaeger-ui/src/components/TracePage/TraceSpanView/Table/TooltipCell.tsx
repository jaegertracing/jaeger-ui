import { makeStyles } from '@material-ui/core'
import React, { CSSProperties } from 'react'
import { CellProps } from 'react-table'

const useStyles = makeStyles({
  truncated: {
    textOverflow: 'ellipsis',
    overflow: 'hidden',
    whiteSpace: 'nowrap',
  },
})

export const TooltipCell: React.FC<CellProps<any>> = ({ cell: { value }, column: { align = 'left' } }) => (
  <Tooltip text={value} align={align} />
)

interface TooltipProps {
  text: string
  tooltip?: string
  align: string
}

export const Tooltip: React.FC<TooltipProps> = ({ text, tooltip = text, align }) => {
  const classes = useStyles({})
  return (
    <div className={classes.truncated} style={{ textAlign: align } as CSSProperties}>
      <span title={tooltip}>{text}</span>
    </div>
  )
}
