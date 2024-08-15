// require("dotenv").config();
// const express = require("express");
// const cors = require("cors");
// const postgres = require("postgres");

// const { PGHOST, PGDATABASE, PGUSER, PGPASSWORD, ENDPOINT_ID, PORT } =
//   process.env;

// const sql = postgres({
//   host: PGHOST,
//   database: PGDATABASE,
//   username: PGUSER,
//   password: PGPASSWORD,
//   port: 5432,
//   ssl: "require",
//   connection: {
//     options: `project=${ENDPOINT_ID}`,
//   },
// });

// async function getPgVersion() {
//   try {
//     const result = await sql`SELECT version()`;
//     return result;
//   } catch (err) {
//     throw new Error(`Error fetching PostgreSQL version: ${err.message}`);
//   }
// }

// async function findCompanyByPattern(pattern) {
//   try {
//     const sqlPattern = `%${pattern}%`;
//     const companyDetails = await sql`
//       SELECT id, company_name, email1, email2, email3 FROM company_info
//       WHERE company_name ILIKE ${sqlPattern}
//       OR company_domain ILIKE ${sqlPattern}`;

//     return companyDetails;
//   } catch (err) {
//     throw new Error(
//       `Error fetching details for pattern "${pattern}": ${err.message}`
//     );
//   }
// }

// async function printTableContents() {
//   try {
//     const tableContents = await sql`SELECT * FROM company_info LIMIT 200`;

//     // Transforming the data
//     const transformedContents = tableContents.map((company) => {
//       const emails = [
//         company.email1,
//         company.email2,
//         company.email3,
//         company.email4,
//         company.email5,
//         company.email6,
//       ].filter((email) => email);

//       return {
//         id: company.id,
//         companyName: company.company_name,
//         companyDomain: company.company_domain,
//         emails: emails,
//         creationDate: company.creationdate,
//         lastVerificationDate: company.lastverificationdate,
//       };
//     });

//     return transformedContents;
//   } catch (err) {
//     throw new Error(`Error fetching table contents: ${err.message}`);
//   }
// }

// async function findCompaniesByIds(ids) {
//   try {
//     const comapntdetails = await sql`
//     SELECT * FROM company_info
//     WHERE id = ANY(${ids})`;
//     const transformedCont = comapntdetails.map((company) => {
//       const emails = [
//         company.email1,
//         company.email2,
//         company.email3,
//         company.email4,
//         company.email5,
//         company.email6,
//       ].filter((email) => email);

//       return {
//         id: company.id,
//         companyName: company.company_name,
//         companyDomain: company.company_domain,
//         emails: emails,
//         creationDate: company.creationdate,
//         lastVerificationDate: company.lastverificationdate,
//       };
//     });

//     return transformedCont;
//   } catch (err) {
//     throw new Error(`Error fetching details for IDs ${ids}: ${err.message}`);
//   }
// }

// const app = express();
// app.use(cors());
// const port = PORT || 3000;

// app.get("/version", async (req, res) => {
//   try {
//     const version = await getPgVersion();
//     res.json(version);
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// });

// app.get("/companies", async (req, res) => {
//   const pattern = req.query.pattern || "";
//   try {
//     const companies = await findCompanyByPattern(pattern);
//     res.json(companies);
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// });

// app.get("/table-contents", async (req, res) => {
//   try {
//     const contents = await printTableContents();
//     res.json(contents);
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// });

// app.get("/companies-by-ids", async (req, res) => {
//   const ids = [12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27];
//   if (!ids.length) {
//     return res.status(400).json({ error: "No IDs provided" });
//   }
//   try {
//     const companies = await findCompaniesByIds(ids);
//     res.json(companies);
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// });

// app.listen(port, () => {
//   console.log(`Server is running on port ${port}`);
// });

const express = require("express");
const cors = require("cors");
const routes = require("./routes");
const { PORT } = require("./envSetup");

const app = express();

app.use(cors());
app.use(express.json()); // Middleware to parse JSON bodies

// Use the routes
app.use(routes);

const port = PORT || 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
