const sql = require("./db");

async function getMentor(id, date) {
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
      return null; // Return null if no mentor is found with the given ID
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
          date: row.date.toISOString().split("T")[0], // Format date as 'YYYY-MM-DD'
          startTime: row.start_time.slice(0, 5), // Format time as 'HH:MM'
          endTime: row.end_time.slice(0, 5), // Format time as 'HH:MM'
        });
      }
    });

    if (mentorData.availability.length === 0) {
      return null; // Return null if no availability matches the specified date
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
      const availability = await getMentor(mentorId, date);
      if (availability !== null) {
        availabilityResult.push(availability);
      }
    }

    if (availabilityResult.length === 0) {
      return null;
    }
    if (availabilityResult.length === 1) {
      return availabilityResult[0].id;
    } else {
    }

    console.log(availabilityResult);

    return true; // Return the availability result for further use
  } catch (error) {
    console.error(
      "Error updating mentor availability in database:",
      error.message
    );
    throw new Error("Database update failed");
  }
}

async function main() {
  try {
    const result = await getperfectmentor(
      "22:03",
      "Digital Marketing",
      "30 min",
      "2024-08-24"
    );
    console.log("UpdateMentorSession result:", result);
  } catch (error) {
    console.error("Error in main function:", error.message);
  }
}

main();

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
