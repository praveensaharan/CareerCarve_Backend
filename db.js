// db.js
const postgres = require("postgres");
const {
  PGHOST,
  PGDATABASE,
  PGUSER,
  PGPASSWORD,
  ENDPOINT_ID,
} = require("./envSetup");
// PGPASSWORD = decodeURIComponent(PGPASSWORD);

const sql = postgres({
  host: PGHOST,
  database: PGDATABASE,
  username: PGUSER,
  password: PGPASSWORD,
  port: 5432,
  ssl: "require",
  connection: {
    options: `project=${ENDPOINT_ID}`,
  },
});

module.exports = sql;
