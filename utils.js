// utils.js
const sql = require("./db");
const axios = require("axios");
const { EMAIL_VERIFY } = require("./envSetup");
const { sendSessionEmails } = require("./email");

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

async function getMentorforpay(id, date) {
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

    if (!result || result.length === 0) {
      return null;
    }

    const mentorData = {
      id: result[0].mentor_id,
      availability: [],
    };

    result.forEach((row) => {
      if (
        row.date &&
        row.start_time &&
        row.end_time &&
        row.date.toISOString().split("T")[0] === date
      ) {
        mentorData.availability.push({
          date: row.date.toISOString().split("T")[0],
          startTime: row.start_time.slice(0, 5),
          endTime: row.end_time.slice(0, 5),
        });
      }
    });

    if (mentorData.availability.length === 0) {
      return null;
    }

    return mentorData;
  } catch (error) {
    console.error("Error fetching mentor and availability:", error.message);
    throw new Error("Internal Server Error");
  }
}

async function getperfectmentor(time, role, duration, date) {
  try {
    const mentorResult = await sql`
      SELECT id, roles FROM mentors;
    `;

    const matchingMentorIds = [];

    for (const mentor of mentorResult) {
      const rolesArray = mentor.roles.split(",").map((role) => role.trim());
      if (rolesArray.includes(role)) {
        matchingMentorIds.push(mentor.id);
      }
    }

    if (matchingMentorIds.length === 0) {
      throw new Error(`No mentor found for the role: ${role}`);
    }

    const availabilityResult = [];

    for (const mentorId of matchingMentorIds) {
      const availability = await getMentorforpay(mentorId, date);
      if (availability !== null) {
        availabilityResult.push(availability);
      }
    }

    if (availabilityResult.length === 0) {
      return null;
    }

    const classTimeInMinutes =
      parseInt(time.split(":")[0]) * 60 + parseInt(time.split(":")[1]);
    const durationInMinutes = parseInt(duration.split(" ")[0]);

    let bestMentorId = null;
    let minTimeDifference = Infinity;

    for (const availability of availabilityResult) {
      for (const slot of availability.availability) {
        const startTimeInMinutes =
          parseInt(slot.startTime.split(":")[0]) * 60 +
          parseInt(slot.startTime.split(":")[1]);
        const endTimeInMinutes =
          parseInt(slot.endTime.split(":")[0]) * 60 +
          parseInt(slot.endTime.split(":")[1]);

        if (
          classTimeInMinutes >= startTimeInMinutes &&
          classTimeInMinutes + durationInMinutes <= endTimeInMinutes
        ) {
          const timeDifference = classTimeInMinutes - startTimeInMinutes;
          if (timeDifference >= 0 && timeDifference < minTimeDifference) {
            minTimeDifference = timeDifference;
            bestMentorId = availability.id;
          }
        }
      }
    }

    if (bestMentorId === null) {
      throw new Error(
        "No suitable mentor found for the given time and duration"
      );
    }

    return bestMentorId; // Return the best mentor ID
  } catch (error) {
    console.error("Error finding the perfect mentor:", error.message);
    throw new Error("Database query failed");
  }
}

async function getpaymentid(
  studentId,
  mentorId,
  price,
  role,
  duration,
  date,
  time,
  mentorEmail,
  userEmail
) {
  try {
    // Insert the payment details into the payment table
    const [payment] = await sql`
      INSERT INTO payment (
        student_id,
        mentor_id,
        price,
        role,
        duration,
        date,
        time,
        mentor_email,
        user_email,
        paid
      ) VALUES (
        ${studentId}, 
        ${mentorId}, 
        ${price}, 
        ${role}, 
        ${duration}, 
        ${date}, 
        ${time}, 
        ${mentorEmail}, 
        ${userEmail}, 
        FALSE -- Initially set to unpaid
      )
      RETURNING id;
    `;

    return payment.id; // Return the generated payment ID
  } catch (error) {
    console.error("Error inserting payment record:", error.message);
    throw new Error("Database query failed");
  }
}
async function getfullmentordata(id) {
  try {
    const result = await sql`
      SELECT * FROM  mentors WHERE id = ${id};
    `;

    // Check if the result exists and has at least one row
    if (result.length === 0) {
      return null; // Return null if no mentor is found with the given ID
    }

    return result[0]; // Return the first (and likely only) result
  } catch (error) {
    console.error("Error fetching mentor data:", error.message);
    throw new Error("Internal Server Error");
  }
}

async function getpaymentbyid(id) {
  try {
    const result = await sql`
      SELECT * FROM payment WHERE id = ${id};
    `;

    if (result.length === 0) {
      return { error: "Payment not found" }; // Return an object with an error message if no payment is found
    }

    if (result[0].paid === true) {
      return { message: "Payment already made" }; // Return an object with a message if the payment is already paid
    }

    return result[0]; // Return the first (and likely only) result
  } catch (error) {
    console.error("Error fetching payment data:", error.message);
    throw new Error("Internal Server Error");
  }
}

function formatTimeTo12Hour(time) {
  const [hour, minute, second] = time.split(":");
  const hourInt = parseInt(hour, 10);
  const ampm = hourInt >= 12 ? "PM" : "AM";
  const adjustedHour = hourInt % 12 || 12; // Convert '00' hour to '12' and 24-hour to 12-hour format
  return `${adjustedHour}:${minute} ${ampm}`;
}

// Function to send emails with session details
async function emailssend(mentor_email, user_email, date, time, duration) {
  try {
    const formattedTime = formatTimeTo12Hour(time); // Format the time to 12-hour format

    await sendSessionEmails(
      mentor_email, // mentor's email
      user_email, // user's email
      date, // session date
      formattedTime, // formatted session time
      duration // session duration
    );

    return true; // Return true if emails are sent successfully
  } catch (error) {
    console.error("Error sending emails:", error.message);
    throw new Error("Internal Server Error");
  }
}

async function getpaymentDone(id) {
  try {
    const paymentResult = await sql`
      SELECT * FROM payment WHERE id = ${id};
    `;
    if (paymentResult.length === 0) {
      return { error: "Payment not found" };
    }

    if (paymentResult[0].paid === true) {
      return { message: "Payment already made" };
    }

    const {
      student_id: studentId,
      mentor_id: mentorId,
      role,
      duration,
      date,
      time,
    } = paymentResult[0];

    let startDateTime = new Date(
      `${new Date(date).toISOString().split("T")[0]}T${time}Z`
    );

    startDateTime.setMinutes(startDateTime.getMinutes() + 330);

    const formattedDateTime = startDateTime
      .toISOString()
      .replace("T", " ")
      .split(".")[0];

    await sql`
      INSERT INTO sessions (
        student_id,
        mentor_id,
        date_time,
        duration,
        role,
        order_id
      ) VALUES (
        ${studentId},
        ${mentorId},
        ${formattedDateTime}::TIMESTAMP,
        ${duration},
        ${role},
        ${id}
      );
    `;

    const newEndTime = calculateNewEndTime(time, duration);

    await sql`
      UPDATE availability
      SET start_time = ${newEndTime}
      WHERE mentor_id = ${mentorId}
      AND date = ${date};
    `;

    await sql`
      UPDATE payment SET paid = true WHERE id = ${id};
    `;
    await emailssend(
      paymentResult[0].mentor_email,
      paymentResult[0].user_email,
      paymentResult[0].date,
      paymentResult[0].time,
      paymentResult[0].duration
    );

    return { message: "Payment processed and session scheduled" };
  } catch (error) {
    console.error("Error processing payment:", error.message);
    throw new Error("Internal Server Error");
  }
}

// Helper function to calculate new end time based on start time and duration
function calculateNewEndTime(startTime, duration) {
  const [hours, minutes] = startTime.split(":").map(Number);
  const [durationValue, durationUnit] = duration.split(" ");

  let endHours = hours;
  let endMinutes = minutes;

  if (durationUnit === "min") {
    endMinutes += parseInt(durationValue);
  } else if (durationUnit === "hour" || durationUnit === "hr") {
    endHours += parseInt(durationValue);
  }

  // Adjust hours and minutes if minutes exceed 59
  if (endMinutes >= 60) {
    endHours += Math.floor(endMinutes / 60);
    endMinutes = endMinutes % 60;
  }

  // Ensure time is in the format HH:MM
  const formattedHours = String(endHours).padStart(2, "0");
  const formattedMinutes = String(endMinutes).padStart(2, "0");

  return `${formattedHours}:${formattedMinutes}`;
}

module.exports = {
  getPgVersion,
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
  getperfectmentor,
  getpaymentid,
  getfullmentordata,
  getpaymentbyid,
  getpaymentDone,
};
