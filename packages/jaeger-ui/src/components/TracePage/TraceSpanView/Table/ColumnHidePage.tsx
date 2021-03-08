import { Checkbox, FormControlLabel, Popover, Typography, createStyles, makeStyles } from '@material-ui/core'
import React, { ReactElement } from 'react'
import { TableInstance } from 'react-table'

const useStyles = makeStyles(
  createStyles({
    columnsPopOver: {
      padding: 24,
    },
    popoverTitle: {
      fontWeight: 500,
      padding: '0 24px 24px 0',
      textTransform: 'uppercase',
    },
    grid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(2, 198px)',
      '@media (max-width: 600px)': {
        gridTemplateColumns: 'repeat(1, 160px)',
      },
      gridColumnGap: 6,
      gridRowGap: 6,
    },
  })
)

type ColumnHidePageProps<T extends Record<string, unknown>> = {
  instance: TableInstance<T>
  anchorEl?: Element
  onClose: () => void
  show: boolean
}

const id = 'popover-column-hide'

export function ColumnHidePage<T extends Record<string, unknown>>({
  instance,
  anchorEl,
  onClose,
  show,
}: ColumnHidePageProps<T>): ReactElement | null {
  const classes = useStyles({})
  const { allColumns, toggleHideColumn } = instance
  const hideableColumns = allColumns.filter((column) => !(column.id === '_selector'))
  const checkedCount = hideableColumns.reduce((acc, val) => acc + (val.isVisible ? 0 : 1), 0)

  const onlyOneOptionLeft = checkedCount + 1 >= hideableColumns.length

  return hideableColumns.length > 1 ? (
    <div>
      <Popover
        anchorEl={anchorEl}
        className={classes.columnsPopOver}
        id={id}
        onClose={onClose}
        open={show}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <div className={classes.columnsPopOver}>
          <Typography className={classes.popoverTitle}>Visible Columns</Typography>
          <div className={classes.grid}>
            {hideableColumns.map((column) => (
              <FormControlLabel
                key={column.id}
                control={<Checkbox value={`${column.id}`} color="primary" disabled={column.isVisible && onlyOneOptionLeft} />}
                label={column.render('Header')}
                checked={column.isVisible}
                onChange={() => toggleHideColumn(column.id, column.isVisible)}
              />
            ))}
          </div>
        </div>
      </Popover>
    </div>
  ) : null
}
