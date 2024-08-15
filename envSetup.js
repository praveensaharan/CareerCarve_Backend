// envSetup.js
require("dotenv").config();

const {
  PGHOST,
  PGDATABASE,
  PGUSER,
  PGPASSWORD,
  ENDPOINT_ID,
  PORT,
  EMAIL_VERIFY,
} = process.env;

module.exports = {
  PGHOST,
  PGDATABASE,
  PGUSER,
  PGPASSWORD,
  ENDPOINT_ID,
  PORT,
  EMAIL_VERIFY,
};
