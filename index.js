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
