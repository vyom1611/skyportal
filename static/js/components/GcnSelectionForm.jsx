import { PropTypes } from "prop-types";
import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
// eslint-disable-next-line import/no-unresolved
import { useMediaQuery } from "@mui/material";
import Box from "@mui/material/Box";
import Checkbox from "@mui/material/Checkbox";
import CircularProgress from "@mui/material/CircularProgress";
import FormControlLabel from "@mui/material/FormControlLabel";
import FormGroup from "@mui/material/FormGroup";
import Grid from "@mui/material/Grid";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import { useTheme } from "@mui/material/styles";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import Typography from "@mui/material/Typography";
import makeStyles from "@mui/styles/makeStyles";
import Form from "@rjsf/mui";
import validator from "@rjsf/validator-ajv8";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import utc from "dayjs/plugin/utc";

import Button from "./Button";

import * as galaxiesActions from "../ducks/galaxies";
import * as instrumentActions from "../ducks/instrument";
import * as observationsActions from "../ducks/observations";
import * as sourcesActions from "../ducks/sources";

import AddCatalogQueryPage from "./AddCatalogQueryPage";
import AddSurveyEfficiencyObservationsPage from "./AddSurveyEfficiencyObservationsPage";
import ExecutedObservationsTable from "./ExecutedObservationsTable";
import GalaxyTable from "./GalaxyTable";
import GcnSummary from "./GcnSummary";
import LocalizationPlot from "./LocalizationPlot";
import SourceTable from "./SourceTable";

import * as localizationActions from "../ducks/localization";

dayjs.extend(relativeTime);
dayjs.extend(utc);

const useStyles = makeStyles(() => ({
  select: {
    width: "25%",
  },
  container: {
    width: "99%",
    marginBottom: "1rem",
  },
  selectItem: {
    whiteSpace: "break-spaces",
  },
  localizationSelect: {
    width: "100%",
  },
  localizationSelectItem: {
    whiteSpace: "break-spaces",
  },
  instrumentSelect: {
    width: "100%",
  },
  instrumentSelectItem: {
    whiteSpace: "break-spaces",
  },
  form: {
    marginBottom: "1rem",
  },
  formGroup: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(8rem, 1fr))",
    justifyContent: "space-evenly",
    alignItems: "center",
    width: "100%",
  },
  formGroupSmall: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "flex-end",
    alignItems: "right",
  },
  formItem: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "flex-start",
    alignItems: "center",
    margin: 0,
  },
  formContainer: {
    maxWidth: "95vw",
    width: "100%",
  },
  formContainerItem: {
    maxWidth: "87vw",
    width: "100%",
  },
  dateGroup: {
    display: "grid",
    gridGap: "1rem",
    gridTemplateColumns: "repeat(auto-fit, minmax(40%, 1fr))",
    justifyContent: "space-evenly",
    alignItems: "center",
    width: "100%",
  },
  localizationPlot: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
  },
  localizationPlotSmall: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    maxWidth: "90vw",
    width: "100%",
  },
  marginBottom: {
    marginBottom: "1rem",
  },
  buttons: {
    display: "grid",
    gridGap: "1rem",
    gridTemplateColumns: "repeat(auto-fit, minmax(5rem, 1fr))",
    "& > button": {
      maxHeight: "4rem",
      // no space between 2 lines of text
      lineHeight: "1rem",
    },
    marginBottom: "1rem",
  },
}));

const GcnEventSourcesPage = ({
  dateobs,
  sources,
  localizationName,
  sourceFilteringState,
}) => {
  const classes = useStyles();
  const dispatch = useDispatch();
  const [sourcesRowsPerPage, setSourcesRowsPerPage] = useState(100);

  const handleSourcesTableSorting = (sortData, filterData) => {
    dispatch(
      sourcesActions.fetchGcnEventSources(dateobs, {
        ...filterData,
        localizationName,
        pageNumber: 1,
        numPerPage: sourcesRowsPerPage,
        sortBy: sortData.name,
        sortOrder: sortData.direction,
      })
    );
  };

  const handleSourcesTablePagination = (
    pageNumber,
    numPerPage,
    sortData,
    filterData
  ) => {
    setSourcesRowsPerPage(numPerPage);
    const data = {
      ...filterData,
      localizationName,
      pageNumber,
      numPerPage,
    };
    if (sortData && Object.keys(sortData).length > 0) {
      data.sortBy = sortData.name;
      data.sortOrder = sortData.direction;
    }
    dispatch(sourcesActions.fetchGcnEventSources(dateobs, data));
  };

  // eslint-disable-next-line
  if (!sources || sources?.sources?.length === 0) {
    return (
      <div className={classes.noSources}>
        <Typography variant="h5">Event sources</Typography>
        <br />
        <Typography variant="h5" align="center">
          No sources within localization.
        </Typography>
      </div>
    );
  }

  return (
    <div className={classes.sourceList}>
      <SourceTable
        sources={sources.sources}
        title="Event Sources"
        paginateCallback={handleSourcesTablePagination}
        pageNumber={sources.pageNumber}
        totalMatches={sources.totalMatches}
        numPerPage={sources.numPerPage}
        sortingCallback={handleSourcesTableSorting}
        favoritesRemoveButton
        hideTitle
        includeGcnStatus
        sourceInGcnFilter={sourceFilteringState}
      />
    </div>
  );
};

GcnEventSourcesPage.propTypes = {
  dateobs: PropTypes.string.isRequired,
  sources: PropTypes.shape({
    pageNumber: PropTypes.number,
    totalMatches: PropTypes.number,
    numPerPage: PropTypes.number,
    sources: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.string,
        ra: PropTypes.number,
        dec: PropTypes.number,
        origin: PropTypes.string,
        alias: PropTypes.arrayOf(PropTypes.string),
        redshift: PropTypes.number,
        classifications: PropTypes.arrayOf(
          PropTypes.shape({
            id: PropTypes.number,
            classification: PropTypes.string,
            created_at: PropTypes.string,
            groups: PropTypes.arrayOf(
              PropTypes.shape({
                id: PropTypes.number,
                name: PropTypes.string,
              })
            ),
          })
        ),
        recent_comments: PropTypes.arrayOf(PropTypes.shape({})),
        altdata: PropTypes.shape({
          tns: PropTypes.shape({
            name: PropTypes.string,
          }),
        }),
        spectrum_exists: PropTypes.bool,
        last_detected_at: PropTypes.string,
        last_detected_mag: PropTypes.number,
        peak_detected_at: PropTypes.string,
        peak_detected_mag: PropTypes.number,
        groups: PropTypes.arrayOf(
          PropTypes.shape({
            id: PropTypes.number,
            name: PropTypes.string,
          })
        ),
      })
    ),
  }),
  localizationName: PropTypes.string.isRequired,
  sourceFilteringState: PropTypes.shape({
    startDate: PropTypes.string,
    endDate: PropTypes.string,
    localizationCumprob: PropTypes.number,
  }).isRequired,
};

GcnEventSourcesPage.defaultProps = {
  sources: null,
};

const MyObjectFieldTemplate = (props) => {
  const { properties, uiSchema } = props;

  return (
    <Grid
      container
      direction="column"
      justify="space-between"
      alignItems="center"
      spacing={2}
    >
      {uiSchema["ui:grid"].map((row) => (
        <Grid
          item
          container
          direction="row"
          justify="space-between"
          alignItems="center"
          spacing={2}
          key={JSON.stringify(row)}
        >
          {Object.keys(row).map((fieldName) => (
            <Grid item xs={row[fieldName]} key={fieldName}>
              {properties.find((p) => p.name === fieldName).content}
            </Grid>
          ))}
        </Grid>
      ))}
    </Grid>
  );
};

MyObjectFieldTemplate.propTypes = {
  uiSchema: PropTypes.shape({
    "ui:grid": PropTypes.arrayOf(PropTypes.shape({})),
  }).isRequired,
  properties: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string,
      content: PropTypes.node,
    })
  ).isRequired,
};

const GcnSelectionForm = ({
  dateobs,
  selectedLocalizationName,
  setSelectedLocalizationName,
}) => {
  const theme = useTheme();
  const classes = useStyles();
  const dispatch = useDispatch();

  const projectionOptions = ["orthographic", "mollweide"];

  const displayOptions = [
    "localization",
    "sources",
    "galaxies",
    "instrument",
    "observations",
  ];
  const displayOptionsDefault = Object.fromEntries(
    displayOptions.map((x) => {
      if (x === "localization") {
        return [x, true];
      }
      return [x, false];
    })
  );
  const displayOptionsAvailable = Object.fromEntries(
    displayOptions.map((x) => [x, true])
  );

  const gcnEvent = useSelector((state) => state.gcnEvent);
  const groups = useSelector((state) => state.groups.userAccessible);
  const { analysisLoc } = useSelector((state) => state.localization);
  const [selectedFields, setSelectedFields] = useState([]);

  const [selectedInstrumentId, setSelectedInstrumentId] = useState(null);
  const [selectedLocalizationId, setSelectedLocalizationId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmittingTreasureMap, setIsSubmittingTreasureMap] = useState(null);
  const [isDeletingTreasureMap, setIsDeletingTreasureMap] = useState(null);
  const [checkedDisplayState, setCheckedDisplayState] = useState(
    displayOptionsDefault
  );
  const [skymapInstrument, setSkymapInstrument] = useState(null);

  const [tabIndex, setTabIndex] = useState(1);
  const [selectedProjection, setSelectedProjection] = useState(
    projectionOptions[0]
  );

  const [sourceFilteringState, setSourceFilteringState] = useState({
    startDate: null,
    endDate: null,
    localizationName: null,
    localizationCumprob: null,
  });

  const handleChangeTab = (event, newValue) => {
    setTabIndex(newValue);
  };

  const defaultStartDate = dayjs
    .utc(gcnEvent?.dateobs)
    .format("YYYY-MM-DD HH:mm:ss");
  const defaultEndDate = dayjs
    .utc(gcnEvent?.dateobs)
    .add(7, "day")
    .format("YYYY-MM-DD HH:mm:ss");
  const [formDataState, setFormDataState] = useState({
    startDate: defaultStartDate,
    endDate: defaultEndDate,
  });

  const { telescopeList } = useSelector((state) => state.telescopes);
  const { instrumentList } = useSelector((state) => state.instruments);
  const sortedInstrumentList = [...instrumentList];
  sortedInstrumentList.sort((i1, i2) => {
    if (i1.name > i2.name) {
      return 1;
    }
    if (i2.name > i1.name) {
      return -1;
    }
    return 0;
  });

  const gcnEventSources = useSelector(
    (state) => state?.sources?.gcnEventSources
  );
  const gcnEventGalaxies = useSelector(
    (state) => state?.galaxies?.gcnEventGalaxies
  );
  const gcnEventObservations = useSelector(
    (state) => state?.observations?.gcnEventObservations
  );

  useEffect(() => {
    const setDefaults = async () => {
      // reorder the instrument list by instrument id, and also make sure that the instrument called ZTF is first
      const orderedInstrumentList = [...instrumentList];
      orderedInstrumentList.sort((i1, i2) => {
        if (i1.name === "ZTF") {
          return -1;
        }
        if (i2.name === "ZTF") {
          return 1;
        }
        if (i1.id > i2.id) {
          return 1;
        }
        if (i2.id > i1.id) {
          return -1;
        }
        return 0;
      });
      setSelectedInstrumentId(orderedInstrumentList[0]?.id);
      setSelectedLocalizationId(gcnEvent.localizations[0]?.id);
      setSelectedLocalizationName(gcnEvent.localizations[0]?.localization_name);
    };
    if (
      dateobs === gcnEvent?.dateobs &&
      dateobs &&
      instrumentList.length > 0 &&
      gcnEvent?.localizations?.length > 0
    ) {
      setDefaults();
    }

    // Don't want to reset everytime the component rerenders and
    // the defaultStartDate is updated, so ignore ESLint here
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, gcnEvent]);

  const isBig = useMediaQuery(theme.breakpoints.up("md"));

  useEffect(() => {
    if (isBig && tabIndex === 0) {
      setTabIndex(1);
    }
  });

  const handleOnChange = (position) => {
    const checkedDisplayStateCopy = JSON.parse(
      JSON.stringify(checkedDisplayState)
    );
    checkedDisplayStateCopy[displayOptions[position]] =
      !checkedDisplayStateCopy[displayOptions[position]];
    setCheckedDisplayState(checkedDisplayStateCopy);
  };

  const handleSubmitTreasureMap = async (id, filterParams) => {
    setIsSubmittingTreasureMap(id);
    const data = {
      startDate: filterParams.startDate,
      endDate: filterParams.endDate,
      localizationCumprob: filterParams.localizationCumprob,
      localizationName: filterParams.localizationName,
      localizationDateobs: filterParams.localizationDateobs,
    };
    await dispatch(observationsActions.submitObservationsTreasureMap(id, data));
    setIsSubmittingTreasureMap(null);
  };

  const handleDeleteTreasureMap = async (id, filterParams) => {
    setIsDeletingTreasureMap(id);
    const data = {
      startDate: filterParams.startDate,
      endDate: filterParams.endDate,
      localizationCumprob: filterParams.localizationCumprob,
      localizationName: filterParams.localizationName,
      localizationDateobs: filterParams.localizationDateobs,
    };
    await dispatch(observationsActions.deleteObservationsTreasureMap(id, data));
    setIsDeletingTreasureMap(null);
  };

  if (!sortedInstrumentList) {
    displayOptionsAvailable.instruments = false;
  }

  if (!gcnEventSources) {
    displayOptionsAvailable.sources = false;
  }

  if (!gcnEventObservations) {
    displayOptionsAvailable.observations = false;
  }

  if (!gcnEventGalaxies) {
    displayOptionsAvailable.galaxies = false;
  }

  if (!gcnEvent?.localizations || gcnEvent?.localizations?.length === 0) {
    displayOptionsAvailable.localization = false;
  }

  const instLookUp = {};
  sortedInstrumentList?.forEach((instrumentObj) => {
    instLookUp[instrumentObj.id] = instrumentObj;
  });

  const telLookUp = {};
  // eslint-disable-next-line no-unused-expressions
  telescopeList?.forEach((tel) => {
    telLookUp[tel.id] = tel;
  });

  const locLookUp = {};
  // eslint-disable-next-line no-unused-expressions
  gcnEvent?.localizations?.forEach((loc) => {
    locLookUp[loc.id] = loc;
  });

  useEffect(() => {
    const fetchSkymapInstrument = async () => {
      dispatch(
        instrumentActions.fetchInstrumentSkymap(
          instLookUp[selectedInstrumentId]?.id,
          locLookUp[selectedLocalizationId]
        )
      ).then((response) => setSkymapInstrument(response.data));
    };
    if (
      instLookUp[selectedInstrumentId] &&
      Object.keys(locLookUp).includes(selectedLocalizationId?.toString())
    ) {
      fetchSkymapInstrument();
    }
  }, [
    dispatch,
    setSkymapInstrument,
    selectedLocalizationId,
    selectedInstrumentId,
  ]);

  useEffect(() => {
    if (selectedLocalizationName && gcnEvent?.dateobs) {
      dispatch(
        localizationActions.fetchLocalization(
          gcnEvent?.dateobs,
          gcnEvent?.localizations.find(
            (loc) => loc.id === selectedLocalizationId
          )?.localization_name,
          "analysis"
        )
      );
    }
  }, [dispatch, selectedLocalizationName]);

  const handleSelectedInstrumentChange = (e) => {
    setSelectedInstrumentId(e.target.value);
  };

  const handleSelectedLocalizationChange = (e) => {
    setSelectedLocalizationId(e.target.value);
    setSelectedLocalizationName(locLookUp[e.target.value].localization_name);
  };

  const handleSubmit = async ({ formData }) => {
    setIsSubmitting(true);
    formData.startDate = formData.startDate
      .replace("+00:00", "")
      .replace(".000Z", "");
    formData.endDate = formData.endDate
      .replace("+00:00", "")
      .replace(".000Z", "");

    if (Object.keys(locLookUp).includes(selectedLocalizationId?.toString())) {
      formData.localizationName =
        locLookUp[selectedLocalizationId].localization_name;
    }

    if (formData.queryList.includes("sources")) {
      await dispatch(
        sourcesActions.fetchGcnEventSources(gcnEvent?.dateobs, formData)
      );
      setSourceFilteringState(formData);
    }
    formData.includeGeoJSON = true;
    if (formData.queryList.includes("observations")) {
      await dispatch(
        observationsActions.fetchGcnEventObservations(
          gcnEvent?.dateobs,
          formData
        )
      );
    }
    if (formData.queryList.includes("galaxies")) {
      await dispatch(
        galaxiesActions.fetchGcnEventGalaxies(gcnEvent?.dateobs, formData)
      );
    }
    setFormDataState(formData);
    setIsSubmitting(false);
  };

  function validate(formData, errors) {
    if (formData.start_date > formData.end_date) {
      errors.start_date.addError(
        "Start date must be before end date, please fix."
      );
    }
    if (
      formData.localizationCumprob < 0 ||
      formData.localizationCumprob > 1.01
    ) {
      errors.cumulative.addError(
        "Value of cumulative should be between 0 and 1"
      );
    }
    return errors;
  }

  const GcnSourceSelectionFormSchema = {
    type: "object",
    properties: {
      startDate: {
        type: "string",
        title: "Start Date",
        default: defaultStartDate,
      },
      endDate: {
        type: "string",
        title: "End Date",
        default: defaultEndDate,
      },
      numberDetections: {
        type: "number",
        title: "Minimum Number of Detections",
        default: 2,
      },
      localizationCumprob: {
        type: "number",
        title: "Cumulative Probability",
        default: 0.95,
      },
      maxDistance: {
        type: "number",
        title: "Maximum Distance [Mpc]",
        default: 150,
      },
      localizationRejectSources: {
        type: "boolean",
        title: "Do not display rejected sources",
      },
      queryList: {
        type: "array",
        items: {
          type: "string",
          enum: ["sources", "galaxies", "observations"],
        },
        uniqueItems: true,
        default: ["sources"],
        title: "Query list",
      },
      group_ids: {
        type: "array",
        items: {
          type: "number",
          enum: groups.map((group) => group.id),
          enumNames: groups.map((group) => group.name),
        },
        uniqueItems: true,
        default: [groups[0]?.id],
        title: "Groups",
      },
    },
    required: ["startDate", "endDate", "localizationCumprob", "queryList"],
  };

  const uiSchema = {
    "ui:grid": [
      {
        startDate: 6,
        endDate: 6,
      },
      {
        numberDetections: 4,
        localizationCumprob: 4,
        maxDistance: 4,
      },
      {
        localizationRejectSources: 12,
      },
      {
        queryList: 6,
        group_ids: 6,
      },
    ],
  };

  if (gcnEvent?.dateobs === dateobs) {
    return (
      <Grid container spacing={4}>
        <Grid
          item
          sm={4}
          sx={{ display: { xs: "none", sm: "none", md: "block" } }}
        >
          {Object.keys(locLookUp).includes(
            selectedLocalizationId?.toString()
          ) && (
            <div style={{ marginTop: "0.5rem" }}>
              <LocalizationPlot
                localization={analysisLoc}
                sources={gcnEventSources}
                galaxies={gcnEventGalaxies}
                instrument={skymapInstrument}
                observations={gcnEventObservations}
                options={checkedDisplayState}
                selectedFields={selectedFields}
                setSelectedFields={setSelectedFields}
                projection={selectedProjection}
              />
              <InputLabel
                style={{ marginTop: "0.5rem", marginBottom: "0.25rem" }}
                id="projection"
              >
                Projection
              </InputLabel>
              <Select
                labelId="projection"
                id="projection"
                value={selectedProjection}
                onChange={(e) => setSelectedProjection(e.target.value)}
                style={{ width: "100%" }}
              >
                {projectionOptions.map((option) => (
                  <MenuItem value={option} key={option}>
                    {option}
                  </MenuItem>
                ))}
              </Select>
              <InputLabel
                style={{ marginTop: "0.5rem", marginBottom: "0.25rem" }}
                id="showOnPlot"
              >
                Show/Hide on Plot
              </InputLabel>
              <FormGroup className={classes.formGroup}>
                {displayOptions.map((option, index) => (
                  <FormControlLabel
                    control={
                      <Checkbox
                        onChange={() => handleOnChange(index)}
                        checked={checkedDisplayState[displayOptions[index]]}
                      />
                    }
                    label={option}
                    key={option}
                    disabled={!displayOptionsAvailable[option]}
                    className={classes.formItem}
                  />
                ))}
              </FormGroup>
            </div>
          )}
        </Grid>
        <Grid item sm={12} md={8}>
          <Tabs
            value={tabIndex}
            onChange={handleChangeTab}
            aria-label="gcn_tabs"
            variant="scrollable"
            xs={12}
            sx={{
              display: {
                maxWidth: "95vw",
                width: "100&",
                "& > button": { lineHeight: "1.5rem" },
              },
            }}
          >
            {/* the first tab called skymap has to be hidden until we reach the sm breakpoint */}
            <Tab label="Skymap" sx={{ display: { sm: "block", md: "none" } }} />
            <Tab label="Query Form" />
            <Tab label="Sources" />
            <Tab label="Galaxies" />
            <Tab label="Observations" />
          </Tabs>

          {tabIndex === 0 && (
            <Box sx={{ display: { sm: "block", md: "none" } }}>
              {Object.keys(locLookUp).includes(
                selectedLocalizationId?.toString()
              ) && (
                <Grid container spacing={2}>
                  <Grid
                    item
                    sm={8}
                    md={12}
                    className={classes.localizationPlotSmall}
                  >
                    <LocalizationPlot
                      localization={analysisLoc}
                      sources={gcnEventSources}
                      galaxies={gcnEventGalaxies}
                      instrument={skymapInstrument}
                      observations={gcnEventObservations}
                      options={checkedDisplayState}
                      selectedFields={selectedFields}
                      setSelectedFields={setSelectedFields}
                      projection={selectedProjection}
                    />
                  </Grid>
                  <Grid item xs={9} sm={4} md={12}>
                    <InputLabel
                      style={{ marginTop: "0.5rem", marginBottom: "0.25rem" }}
                      id="projection"
                    >
                      Projection
                    </InputLabel>
                    <Select
                      labelId="projection"
                      id="projection"
                      value={selectedProjection}
                      onChange={(e) => setSelectedProjection(e.target.value)}
                      style={{ width: "100%" }}
                    >
                      {projectionOptions.map((option) => (
                        <MenuItem value={option} key={option}>
                          {option}
                        </MenuItem>
                      ))}
                    </Select>
                    <InputLabel
                      style={{ marginTop: "0.5rem", marginBottom: "0.25rem" }}
                      id="showOnPlot"
                    >
                      Show/Hide on Plot
                    </InputLabel>
                    <FormGroup className={classes.formGroupSmall}>
                      {displayOptions.map((option, index) => (
                        <FormControlLabel
                          control={
                            <Checkbox
                              onChange={() => handleOnChange(index)}
                              checked={
                                checkedDisplayState[displayOptions[index]]
                              }
                            />
                          }
                          label={option}
                          key={option}
                          disabled={!displayOptionsAvailable[option]}
                          className={classes.formItem}
                        />
                      ))}
                    </FormGroup>
                  </Grid>
                </Grid>
              )}
            </Box>
          )}

          {tabIndex === 1 && (
            <Grid
              container
              spacing={1}
              className={classes.formContainer}
              alignItems="center"
            >
              <Grid item sm={12} className={classes.formContainerItem}>
                <InputLabel id="localizationSelectLabel">
                  Localization
                </InputLabel>
                <Select
                  inputProps={{ MenuProps: { disableScrollLock: true } }}
                  labelId="localizationSelectLabel"
                  value={selectedLocalizationId || ""}
                  onChange={handleSelectedLocalizationChange}
                  name="gcnPageLocalizationSelect"
                  className={classes.localizationSelect}
                >
                  {gcnEvent?.localizations?.map((localization) => (
                    <MenuItem
                      value={localization.id}
                      key={localization.id}
                      className={classes.localizationSelectItem}
                    >
                      {`Skymap: ${localization.localization_name} / Created: ${localization.created_at}`}
                    </MenuItem>
                  ))}
                </Select>
              </Grid>
              <Grid item sm={12} className={classes.formContainerItem}>
                <InputLabel id="instrumentSelectLabel">Instrument</InputLabel>
                <Select
                  inputProps={{ MenuProps: { disableScrollLock: true } }}
                  labelId="instrumentSelectLabel"
                  value={selectedInstrumentId || ""}
                  onChange={handleSelectedInstrumentChange}
                  name="gcnPageInstrumentSelect"
                  className={classes.instrumentSelect}
                >
                  {sortedInstrumentList?.map((instrument) => (
                    <MenuItem
                      value={instrument.id}
                      key={instrument.id}
                      className={classes.instrumentSelectItem}
                    >
                      {`${telLookUp[instrument.telescope_id]?.name} / ${
                        instrument.name
                      }`}
                    </MenuItem>
                  ))}
                </Select>
              </Grid>
              <Grid
                item
                xs={11}
                sm={12}
                data-testid="gcnsource-selection-form"
                className={classes.form}
              >
                <Form
                  schema={GcnSourceSelectionFormSchema}
                  uiSchema={uiSchema}
                  templates={{ ObjectFieldTemplate: MyObjectFieldTemplate }}
                  validator={validator}
                  onSubmit={handleSubmit}
                  // eslint-disable-next-line react/jsx-no-bind
                  customValidate={validate}
                  disabled={isSubmitting}
                  liveValidate
                />
                {isSubmitting && (
                  <div>
                    <CircularProgress />
                  </div>
                )}
              </Grid>
              {gcnEvent && selectedLocalizationId ? (
                <Grid item xs={11} sm={12}>
                  <div className={classes.buttons}>
                    <GcnSummary dateobs={dateobs} />
                    <AddSurveyEfficiencyObservationsPage />
                    <AddCatalogQueryPage />
                    {isSubmittingTreasureMap === selectedInstrumentId ? (
                      <div>
                        <CircularProgress />
                      </div>
                    ) : (
                      <Button
                        secondary
                        onClick={() => {
                          handleSubmitTreasureMap(
                            selectedInstrumentId,
                            formDataState
                          );
                        }}
                        type="submit"
                        size="small"
                        data-testid={`treasuremapRequest_${selectedInstrumentId}`}
                      >
                        Send to Treasure Map
                      </Button>
                    )}
                    {isDeletingTreasureMap === selectedInstrumentId ? (
                      <div>
                        <CircularProgress />
                      </div>
                    ) : (
                      <Button
                        secondary
                        onClick={() => {
                          handleDeleteTreasureMap(
                            selectedInstrumentId,
                            formDataState
                          );
                        }}
                        type="submit"
                        size="small"
                        data-testid={`treasuremapDelete_${selectedInstrumentId}`}
                      >
                        Retract from Treasure Map
                      </Button>
                    )}
                  </div>
                </Grid>
              ) : (
                <CircularProgress />
              )}
            </Grid>
          )}

          {tabIndex === 2 && (
            <div>
              {gcnEventSources?.sources ? (
                <div>
                  {gcnEventSources?.sources.length === 0 ? (
                    <Typography variant="h5">None</Typography>
                  ) : (
                    <div>
                      {selectedLocalizationName && (
                        <GcnEventSourcesPage
                          dateobs={dateobs}
                          sources={gcnEventSources}
                          localizationName={selectedLocalizationName}
                          sourceFilteringState={sourceFilteringState}
                        />
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <Typography variant="h5">Fetching sources...</Typography>
              )}
            </div>
          )}

          {tabIndex === 3 && (
            <div>
              {gcnEventGalaxies?.galaxies ? (
                <div>
                  {gcnEventGalaxies?.galaxies.length === 0 ? (
                    <Typography variant="h5">None</Typography>
                  ) : (
                    <div>
                      <GalaxyTable
                        galaxies={gcnEventGalaxies.galaxies}
                        totalMatches={gcnEventGalaxies.totalMatches}
                        serverSide={false}
                        showTitle
                      />
                    </div>
                  )}
                </div>
              ) : (
                <Typography variant="h5">Fetching galaxies...</Typography>
              )}
            </div>
          )}

          {tabIndex === 4 && (
            <div>
              {gcnEventObservations?.observations ? (
                <div>
                  {gcnEventObservations?.observations.length === 0 ? (
                    <Typography variant="h5">None</Typography>
                  ) : (
                    <div>
                      <ExecutedObservationsTable
                        observations={gcnEventObservations.observations}
                        totalMatches={gcnEventObservations.totalMatches}
                        serverSide={false}
                      />
                    </div>
                  )}
                </div>
              ) : (
                <Typography variant="h5">Fetching observations...</Typography>
              )}
            </div>
          )}
        </Grid>
      </Grid>
    );
  }
  return <CircularProgress />;
};

GcnSelectionForm.propTypes = {
  dateobs: PropTypes.string.isRequired,
  selectedLocalizationName: PropTypes.string.isRequired,
  setSelectedLocalizationName: PropTypes.func.isRequired,
};
export default GcnSelectionForm;
