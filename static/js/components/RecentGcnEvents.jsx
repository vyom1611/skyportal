import React, { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Link } from "react-router-dom";
import PropTypes from "prop-types";

import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import DragHandleIcon from "@mui/icons-material/DragHandle";
import makeStyles from "@mui/styles/makeStyles";

import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import relativeTime from "dayjs/plugin/relativeTime";
import { grey } from "@mui/material/colors";
import Button from "./Button";

import * as profileActions from "../ducks/profile";
import * as recentGcnEventsActions from "../ducks/recentGcnEvents";
import WidgetPrefsDialog from "./WidgetPrefsDialog";
import GcnTags from "./GcnTags";

dayjs.extend(relativeTime);
dayjs.extend(utc);

const useStyles = makeStyles((theme) => ({
  header: {},
  eventListContainer: {
    height: "calc(100% - 5rem)",
    overflowY: "auto",
    marginTop: "0.625rem",
    paddingTop: "0.625rem",
    color: theme.palette.mode === "light" ? null : grey[100],
  },
  eventList: {
    display: "block",
    alignItems: "center",
    listStyleType: "none",
    paddingLeft: 0,
    marginTop: 0,
    color: theme.palette.mode === "light" ? null : grey[100],
  },
  eventNameContainer: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    color: theme.palette.mode === "light" ? null : grey[100],
  },
  eventNameLink: {
    color:
      theme.palette.mode === "light" ? theme.palette.primary.main : grey[100],
  },
  eventTags: {
    marginLeft: "1rem",
    "& > div": {
      margin: "0.25rem",
      color: "white",
      background:
        theme.palette.mode === "light" ? theme.palette.primary.main : grey[100],
    },
  },
}));

const defaultPrefs = {
  maxNumEvents: "5",
};

const RecentGcnEvents = ({ classes }) => {
  const styles = useStyles();

  const gcnEvents = useSelector((state) => state.recentGcnEvents);
  const recentEventsPrefs =
    useSelector((state) => state.profile.preferences?.recentGcnEvents) ||
    defaultPrefs;

  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(recentGcnEventsActions.fetchRecentGcnEvents());
  }, [dispatch]);

  return (
    <Paper elevation={1} className={classes.widgetPaperFillSpace}>
      <div className={classes.widgetPaperDiv}>
        <div className={styles.header}>
          <Typography variant="h6" display="inline">
            Recent GCN Events
          </Typography>
          <DragHandleIcon className={`${classes.widgetIcon} dragHandle`} />
          <div className={classes.widgetIcon}>
            <WidgetPrefsDialog
              // Only expose num events
              initialValues={{
                maxNumEvents: recentEventsPrefs.maxNumEvents,
              }}
              stateBranchName="recentGcnEvents"
              title="Recent Events Preferences"
              onSubmit={profileActions.updateUserPreferences}
            />
          </div>
        </div>
        <div className={styles.eventListContainer}>
          <p>Displaying most-viewed events</p>
          <ul className={styles.eventList}>
            {gcnEvents?.map((gcnEvent) => (
              <li key={gcnEvent.dateobs}>
                <div className={styles.eventNameContainer}>
                  &nbsp; -&nbsp;
                  <Link to={`/gcn_events/${gcnEvent.dateobs}`}>
                    <Button>
                      {dayjs(gcnEvent.dateobs).format("YYMMDD HH:mm:ss")}
                    </Button>
                  </Link>
                  <div>({dayjs().to(dayjs.utc(`${gcnEvent.dateobs}Z`))})</div>
                  <div>
                    <GcnTags gcnEvent={gcnEvent} />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Paper>
  );
};

RecentGcnEvents.propTypes = {
  classes: PropTypes.shape({
    widgetPaperDiv: PropTypes.string.isRequired,
    widgetIcon: PropTypes.string.isRequired,
    widgetPaperFillSpace: PropTypes.string.isRequired,
  }).isRequired,
};

export default RecentGcnEvents;
