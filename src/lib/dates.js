import moment from "moment";

export const DATE_INPUT_FORMAT = "DD/MM/YYYY";

export const parseDateInput = (value) => {
  const parsed = moment(value, [DATE_INPUT_FORMAT, "YYYY-MM-DD"], true);
  return parsed.isValid() ? parsed : null;
};

export const dateInputToIso = (value) => {
  const parsed = parseDateInput(value);
  return parsed ? parsed.format("YYYY-MM-DD") : "";
};

export const formatDateInput = (value) => {
  const parsed = moment(value);
  return parsed.isValid() ? parsed.format(DATE_INPUT_FORMAT) : "";
};
