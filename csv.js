const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");
const sql = require("./db");

const filePath = path.join(__dirname, "hr.csv");

async function readCSVFile(filePath) {
  const results = [];

  return new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(csv())
      .on("data", (data) => results.push(data))
      .on("end", async () => {
        try {
          for (const entry of results) {
            const companyEmail = entry["Email"];
            if (companyEmail) {
              const emails = [companyEmail];
              const domainMatch = companyEmail.match(/@([^@]+)/);

              if (!domainMatch) {
                throw new Error("Invalid email format.");
              }

              const companyDomain = domainMatch[1].replace(/\.[^.]*$/, "");
              console.log(entry["Company"], companyEmail, companyDomain);

              // Await the insertOrUpdate function to ensure sequential processing
              await insertOrUpdateCompanyContacts2(
                entry["Company"],
                emails,
                companyDomain
              );
            }
          }
          resolve();
        } catch (error) {
          console.error("Error processing CSV data:", error.message);
          reject(error);
        }
      })
      .on("error", (error) => {
        console.error("Error reading the file:", error);
        reject(error);
      });
  });
}

// Run the function to read and parse the CSV file

async function insertOrUpdateCompanyContacts2(
  companyName,
  emails,
  companyDomain
) {
  try {
    if (!companyName || !companyDomain || !Array.isArray(emails)) {
      throw new Error("Invalid input data");
    }

    const uniqueEmails = [
      ...new Set(
        emails.filter((email) => typeof email === "string" && email.trim())
      ),
    ];

    const existingEntries = await sql`
      SELECT * FROM company_compl
      WHERE company_name = ${companyName}
      AND company_domain = ${companyDomain}
    `;

    if (existingEntries.length > 0) {
      let updatedEmails = new Set();

      existingEntries.forEach((entry) => {
        for (let i = 1; i <= 6; i++) {
          if (entry[`email${i}`]) {
            updatedEmails.add(entry[`email${i}`]);
          }
        }
      });

      uniqueEmails.forEach((email) => {
        updatedEmails.add(email);
      });

      const emailArray = Array.from(updatedEmails).slice(0, 6);
      const firstEntryId = existingEntries[0].id;
      const numEmails = emailArray.length;

      await sql`
        UPDATE company_compl
        SET
          email1 = ${numEmails >= 1 ? emailArray[0] : null},
          email2 = ${numEmails >= 2 ? emailArray[1] : null},
          email3 = ${numEmails >= 3 ? emailArray[2] : null},
          email4 = ${numEmails >= 4 ? emailArray[3] : null},
          email5 = ${numEmails >= 5 ? emailArray[4] : null},
          email6 = ${numEmails >= 6 ? emailArray[5] : null},
          verify = true
        WHERE id = ${firstEntryId}
      `;

      console.log("Successfully updated company contacts with new emails.");
    } else {
      const emailValues = uniqueEmails
        .slice(0, 6)
        .concat(Array(6).fill(null))
        .slice(0, 6);

      await sql`
        INSERT INTO company_compl (
          company_name,
          email1, email2, email3, email4, email5, email6,
          verify,
          company_domain
        ) VALUES (
          ${companyName},
          ${emailValues[0]}, ${emailValues[1]}, ${emailValues[2]},
          ${emailValues[3]}, ${emailValues[4]}, ${emailValues[5]},
          true,
          ${companyDomain}
        )
      `;

      console.log("Successfully inserted new company contacts.");
    }
  } catch (err) {
    console.error("Error inserting or updating company contacts:", err.message);
    throw err;
  }
}

readCSVFile(filePath).then(() => {
  console.log("CSV processing complete.");
});
