// utils.js
const sql = require("./db");
const axios = require("axios");
const { EMAIL_VERIFY } = require("./envSetup");

async function getPgVersion() {
  try {
    const result = await sql`SELECT version()`;
    return result;
  } catch (err) {
    throw new Error(`Error fetching PostgreSQL version: ${err.message}`);
  }
}

async function getMentors() {
  try {
    const result = await sql`
      SELECT 
        m.id AS mentor_id,
        m.name,
        m.roles,
        m.rating,
        a.date,
        a.start_time,
        a.end_time
      FROM 
        mentors m
      LEFT JOIN 
        availability a
      ON 
        m.id = a.mentor_id
      ORDER BY 
        m.id, a.date, a.start_time;
    `;

    const mentorsMap = {};

    result.forEach((row) => {
      const mentorId = row.mentor_id;

      if (!mentorsMap[mentorId]) {
        mentorsMap[mentorId] = {
          id: mentorId,
          name: row.name,
          roles: row.roles,
          rating: row.rating,
          availability: [],
        };
      }

      if (row.date && row.start_time && row.end_time) {
        mentorsMap[mentorId].availability.push({
          date: row.date,
          startTime: row.start_time,
          endTime: row.end_time,
        });
      }
    });

    // Convert the map to an array
    const mentorsList = Object.values(mentorsMap);

    return mentorsList;
  } catch (error) {
    console.error("Error fetching mentors and availability:", error.message);
    throw new Error("Internal Server Error");
  }
}

async function getMentor(id) {
  try {
    const result = await sql`
      SELECT 
        m.id AS mentor_id,
        m.name,
        m.roles,
        m.rating,
        a.date,
        a.start_time,
        a.end_time
      FROM 
        mentors m
      LEFT JOIN 
        availability a
      ON 
        m.id = a.mentor_id
      WHERE
        m.id = ${id}
      ORDER BY 
        a.date, a.start_time;
    `;

    // Check if the result exists and has at least one row
    if (!result || result.length === 0) {
      return null; // Return null if no mentor is found with the given ID
    }

    // Convert roles to an array
    const rolesArray = result[0].roles.split(",").map((role) => role.trim());

    // Initialize mentorData
    const mentorData = {
      id: result[0].mentor_id,
      name: result[0].name,
      roles: rolesArray, // Assign the roles array here
      availability: [],
    };

    // Populate availability array
    result.forEach((row) => {
      if (row.date && row.start_time && row.end_time) {
        mentorData.availability.push({
          date: row.date.toISOString().split("T")[0], // Format date as 'YYYY-MM-DD'
          startTime: row.start_time.slice(0, 5), // Format time as 'HH:MM'
          endTime: row.end_time.slice(0, 5), // Format time as 'HH:MM'
        });
      }
    });

    return mentorData;
  } catch (error) {
    console.error("Error fetching mentor and availability:", error.message);
    throw new Error("Internal Server Error");
  }
}

async function getSessionMentor(mentorId) {
  try {
    const result = await sql`
      SELECT 
        s.duration,
        s.date_time,
        s.role,
    
        st.name AS student_name
      FROM 
        sessions s
      JOIN 
        students st 
      ON 
        s.student_id = st.id
      WHERE 
        s.mentor_id = ${mentorId}
      ORDER BY 
        s.date_time;
    `;

    if (result.length === 0) {
      return []; // No sessions found for the given mentor ID
    }

    // Format the results into an array of objects
    const sessionsList = result.map((row) => ({
      studentName: row.student_name,
      duration: row.duration,
      dateTime: row.date_time,
      role: row.role,
      orderId: row.order_id,
    }));

    return sessionsList;
  } catch (error) {
    console.error("Error fetching sessions for mentor:", error.message);
    throw new Error("Internal Server Error");
  }
}

async function getSessionStudent(studentId) {
  try {
    const result = await sql`
      SELECT 
        s.duration,
        s.date_time,
        s.role,
        s.order_id,
        m.name AS mentor_name
      FROM 
        sessions s
      JOIN 
        mentors m 
      ON 
        s.mentor_id = m.id
      WHERE 
        s.student_id = ${studentId}
      ORDER BY 
        s.date_time;
    `;

    if (result.length === 0) {
      return []; // No sessions found for the given student ID
    }

    // Format the results into an array of objects
    const sessionsList = result.map((row) => ({
      mentorName: row.mentor_name,
      duration: row.duration,
      dateTime: row.date_time,
      role: row.role,
      orderId: row.order_id,
    }));

    return sessionsList;
  } catch (error) {
    console.error("Error fetching sessions for student:", error.message);
    throw new Error("Internal Server Error");
  }
}

const getOrCreateUserMentor = async (clerkUserId, firstName, email) => {
  try {
    const userQuery = await sql`
      SELECT * FROM mentors 
      WHERE clerk_id = ${clerkUserId};
    `;

    if (userQuery.length === 0) {
      const rating = (Math.random() * 3 + 2).toFixed(1); // Generates a rating between 2.0 and 5.0
      const insertQuery = await sql`
        INSERT INTO mentors (clerk_id, name, rating, email)
        VALUES (${clerkUserId}, ${firstName}, ${rating}, ${email})
        RETURNING *;
      `;
      return insertQuery[0];
    } else {
      return userQuery[0];
    }
  } catch (error) {
    console.error(
      "Error fetching or inserting user information:",
      error.message
    );
    throw new Error("Internal Server Error");
  }
};

const getOrCreateUserStudent = async (clerkUserId, firstName, email) => {
  try {
    const userQuery = await sql`
      SELECT * FROM students 
      WHERE clerk_id = ${clerkUserId};
    `;

    if (userQuery.length === 0) {
      await sql`
        INSERT INTO students (name, email, clerk_id)
        VALUES (${firstName}, ${email}, ${clerkUserId});
      `;
      return { status: "created", message: "New student created." };
    } else {
      return { status: "exists", message: "Student already exists." };
    }
  } catch (error) {
    console.error(
      "Error fetching or inserting user information:",
      error.message
    );
    throw new Error("Internal Server Error");
  }
};

async function UpdateMentor(clerkUserId, updatedName, roles) {
  try {
    // Convert the roles array to a space-separated string
    const formattedRoles = roles.join(", ");

    const result = await sql`
      UPDATE mentors
      SET name = ${updatedName}, roles = ${formattedRoles}
      WHERE clerk_id = ${clerkUserId}
      RETURNING *;
    `;

    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error("Error updating mentor in database:", error);
    throw new Error("Database update failed");
  }
}

async function UpdateMentorSession(clerkUserId, dates) {
  try {
    // Fetch mentor ID from the mentors table using clerkUserId
    const mentorResult = await sql`
      SELECT id FROM mentors WHERE clerk_id = ${clerkUserId};
    `;

    // Ensure mentor exists
    if (mentorResult.length === 0) {
      throw new Error("Mentor not found");
    }

    const mentorId = mentorResult[0].id;

    // Insert each availability into the database
    for (const dateInfo of dates) {
      await sql`
        INSERT INTO availability (mentor_id, date, start_time, end_time)
        VALUES (${mentorId}, ${dateInfo.date}, ${dateInfo.startTime}, ${dateInfo.endTime});
      `;
    }

    return true;
  } catch (error) {
    console.error(
      "Error updating mentor availability in database:",
      error.message
    );
    throw new Error("Database update failed");
  }
}

async function getmentorid(clerkid) {
  try {
    const result = await sql`
      SELECT id FROM mentors WHERE clerk_id = ${clerkid};
    `;
    return result[0].id;
  } catch (error) {
    console.error("Error fetching mentor ID:", error.message);
    throw new Error("Internal Server Error");
  }
}

async function getstudentid(clerkid) {
  try {
    const result = await sql`
      SELECT id FROM students WHERE clerk_id = ${clerkid};
    `;
    return result[0].id;
  } catch (error) {
    console.error("Error fetching student ID:", error.message);
    throw new Error("Internal Server Error");
  }
}

module.exports = {
  getPgVersion,
  findCompanyByPattern,
  printTableContents,
  findCompaniesByIds,
  verifyCompanyEmails,

  getTheArray,
  getTransactions,
  AddCompanyIdToUser,
  redeemCoupon,
  getInsights,
  getMentors,
  getMentor,
  getSessionMentor,
  getSessionStudent,
  getOrCreateUserMentor,
  UpdateMentor,
  UpdateMentorSession,
  getmentorid,
  getstudentid,
  getOrCreateUserStudent,
};
