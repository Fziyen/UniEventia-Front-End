import moment from "moment";

const getEventDateValue = (event, field) =>
  event?.[field] || event?.[field === "startDate" ? "StartDate" : "EndDate"];

export const getEventStartTimestamp = (event) => {
  const start = moment(getEventDateValue(event, "startDate"));
  return start.isValid() ? start.valueOf() : Number.POSITIVE_INFINITY;
};

export const sortEventsByStart = (events) =>
  [...events].sort(
    (first, second) =>
      getEventStartTimestamp(first) - getEventStartTimestamp(second),
  );

export const formatEventDateRange = (event, options = {}) => {
  const startValue = getEventDateValue(event, "startDate");
  const endValue = getEventDateValue(event, "endDate");
  const start = moment(startValue);
  const end = moment(endValue);

  if (!start.isValid()) return "Date unavailable";
  if (!end.isValid()) return start.format("MMM D, YYYY h:mm A");

  const startFormat = options.long
    ? "dddd, MMMM D YYYY, h:mm A"
    : "MMM D, YYYY h:mm A";
  const endFormat = start.isSame(end, "day")
    ? "h:mm A"
    : options.long
      ? "dddd, MMMM D YYYY, h:mm A"
      : "MMM D, YYYY h:mm A";

  return `${start.format(startFormat)} - ${end.format(endFormat)}`;
};
