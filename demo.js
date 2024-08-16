const sql = require("./db");
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

    await sql`
      UPDATE payment SET paid = true WHERE id = ${id};
    `;
    const {
      student_id: studentId,
      mentor_id: mentorId,

      role,
      duration,
      date,
      time,
      mentor_email: mentorEmail,
      user_email: userEmail,

      created_at: createdAt,
    } = paymentResult[0];

    // Insert the session into the sessions table
    const startDateTime = `${date} ${time}`; // Combine date and time for session start
    await sql`
      INSERT INTO sessions (
        student_id, 
        mentor_id, 
        date, 
        duration, 
        role, 
        payment_id
      ) VALUES (
        ${studentId}, 
        ${mentorId}, 
        ${startDateTime}, 
        ${duration}, 
        ${role}, 
        ${id}
      );
    `;

    // Update mentor availability: find the mentorId and date, then update the start_time
    const newEndTime = calculateNewEndTime(time, duration);
    await sql`
      UPDATE availability 
      SET start_time = ${newEndTime} 
      WHERE mentor_id = ${mentorId} 
      AND date = ${date};
    `;

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

async function main() {
  try {
    const result = await getperfectmentor(
      "16:29",
      "Digital Marketing",
      "30 min",
      "2024-08-24"
    );
    console.log("Perfect Mentor ID:", result);
  } catch (error) {
    console.error("Error in main function:", error.message);
  }
}

main();
