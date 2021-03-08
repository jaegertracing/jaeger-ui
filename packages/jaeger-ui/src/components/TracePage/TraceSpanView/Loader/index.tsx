import { Theme } from '@material-ui/core'
import CircularProgress from '@material-ui/core/CircularProgress'
import { createStyles, makeStyles } from '@material-ui/core/styles'
import React from 'react'

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    root: {
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignContent: 'center',
      alignItems: 'center',
      flex: '1 0 auto',
    },
    progress: {
      margin: theme.spacing(2),
    },
  })
)

interface LoaderProps {
  error?: boolean
  retry?: (event: React.MouseEvent<HTMLElement>) => void
  timedOut?: boolean
  pastDelay?: boolean
}

export const Loader: React.FC<LoaderProps> = ({ error, retry, timedOut, pastDelay }) => {
  const classes = useStyles()
  return (
    <div className={classes.root}>
      {error && (
        <div>
          Error! <button onClick={retry}>Retry</button>
        </div>
      )}
      {timedOut && (
        <div>
          Taking a long time... <button onClick={retry}>Retry</button>
        </div>
      )}
      {pastDelay && <div>Loading...</div>}
      <CircularProgress className={classes.progress} />
    </div>
  )
}
