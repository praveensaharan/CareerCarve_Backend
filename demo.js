const sql = require("./db");
const { sendSessionEmails } = require("./email");

// Helper function to calculate new end time based on start time and duration
function formatTimeTo12Hour(time) {
  const [hour, minute, second] = time.split(":");
  const hourInt = parseInt(hour, 10);
  const ampm = hourInt >= 12 ? "PM" : "AM";
  const adjustedHour = hourInt % 12 || 12; // Convert '00' hour to '12' and 24-hour to 12-hour format
  return `${adjustedHour}:${minute} ${ampm}`;
}

async function main() {
  try {
    // Call sendSessionEmails with your session details
    await sendSessionEmails(
      "praveensaharan2002@gmail.com", // mentor's email
      "praveen40109@gmail.com", // user's email
      "2024-08-16", // session date
      formatTimeTo12Hour("16:50:00"), // session time
      "30 min" // session duration
    );
  } catch (error) {
    console.error("Error in sending session emails:", error);
  }
  console.log("Perfect Mentor ID:");
}

main();
