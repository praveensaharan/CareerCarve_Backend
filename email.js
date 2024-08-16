require("dotenv").config();
const nodemailer = require("nodemailer");
const fs = require("fs");
const path = require("path");

// Function to send email
async function sendEmail({ user, pass, to, subject, htmlContent }) {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user,
      pass,
    },
  });

  try {
    const result = await transporter.sendMail({
      from: `CareerCarve <${user}>`,
      to,
      subject,
      generateTextFromHTML: true,
      html: htmlContent,
    });

    console.log(JSON.stringify(result, null, 4));
  } catch (error) {
    console.error("Error sending email:", error);
  }
}

// Function to read the HTML template and customize it
async function sendSessionEmails(
  mentor_email,
  user_email,
  date,
  time,
  duration
) {
  const htmlFilePath = path.join(__dirname, "index.html");

  try {
    const template = await fs.promises.readFile(htmlFilePath, "utf8");

    const customizedHtml = template
      .replace("${time}", time.replace(/AM|PM/g, ""))
      .replace("${morn}", time.includes("AM") ? "AM" : "PM")
      .replace("${duration}", duration)
      .replace(
        "${date}",
        new Date(date).toLocaleDateString("en-US", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      );

    // Send email to mentor
    await sendEmail({
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
      to: mentor_email,
      subject: "📅 Mark Your Calendar: Upcoming Session Details!",
      htmlContent: customizedHtml,
    });

    // Send email to user
    await sendEmail({
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
      to: user_email,
      subject: "📅 Mark Your Calendar: Your Session Details!",
      htmlContent: customizedHtml,
    });

    console.log("Emails sent successfully.");
  } catch (err) {
    console.error("Error sending emails:", err);
  }
}

module.exports = { sendSessionEmails };
