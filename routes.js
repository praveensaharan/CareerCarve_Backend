// routes.js
const express = require("express");
const {
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
} = require("./utils");

const router = express.Router();
const { ClerkExpressRequireAuth } = require("@clerk/clerk-sdk-node");
const { clerkClient } = require("./clerk");

router.get("/fetchmentor", ClerkExpressRequireAuth({}), async (req, res) => {
  if (!req.auth || !req.auth.userId) {
    return res.status(401).json({ error: "Unauthenticated!" });
  }
  try {
    const user = await clerkClient.users.getUser(req.auth.userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    const userInfo = {
      id: user.id,
      email: user.emailAddresses[0].emailAddress,
      firstName: user.firstName || user.emailAddresses[0].emailAddress,
    };

    const credits = await getOrCreateUserMentor(
      userInfo.id,
      userInfo.firstName,
      userInfo.email
    );
    res.status(200).json({ credits });
  } catch (error) {
    console.error("Error fetching user information:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/fetchstudent", ClerkExpressRequireAuth({}), async (req, res) => {
  if (!req.auth || !req.auth.userId) {
    return res.status(401).json({ error: "Unauthenticated!" });
  }

  try {
    const user = await clerkClient.users.getUser(req.auth.userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const userInfo = {
      id: user.id,
      email: user.emailAddresses[0].emailAddress,
      firstName: user.firstName || user.emailAddresses[0].emailAddress,
    };

    const result = await getOrCreateUserStudent(
      userInfo.id,
      userInfo.firstName,
      userInfo.email
    );

    res.status(200).json({ result, userInfo });
  } catch (error) {
    console.error("Error fetching user information:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/updatementor", ClerkExpressRequireAuth({}), async (req, res) => {
  if (!req.auth || !req.auth.userId) {
    return res.status(401).json({ error: "Unauthenticated!" });
  }

  const { name, roles } = req.body; // Extract name and roles from request body
  console.log(roles);
  if (!name || !roles) {
    return res.status(400).json({ error: "Name and roles are required!" });
  }

  try {
    // Fetch user details from Clerk
    const user = await clerkClient.users.getUser(req.auth.userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Update the mentor in the database
    const updatedMentor = await UpdateMentor(user.id, name, roles);

    if (updatedMentor) {
      res.status(200).json({ message: "Mentor details updated successfully!" });
    } else {
      throw new Error("Failed to update mentor details");
    }
  } catch (error) {
    console.error("Error updating mentor details:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post(
  "/updatementorsession",
  ClerkExpressRequireAuth({}),
  async (req, res) => {
    if (!req.auth || !req.auth.userId) {
      return res.status(401).json({ error: "Unauthenticated!" });
    }

    const { dates } = req.body; // Extract dates from request body
    console.log(dates);
    if (!dates || !Array.isArray(dates)) {
      return res
        .status(400)
        .json({ error: "Dates are required and should be an array!" });
    }

    try {
      // Fetch user details from Clerk
      const user = await clerkClient.users.getUser(req.auth.userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      console.log(dates);
      // Update the mentor's availability in the database
      const updatedMentor = await UpdateMentorSession(user.id, dates);

      if (updatedMentor) {
        res.status(200).json({ message: "Availability updated successfully!" });
      } else {
        throw new Error("Failed to update mentor availability");
      }
    } catch (error) {
      console.error("Error updating mentor availability:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

router.get("/", async (req, res) => {
  try {
    const version = await getPgVersion();
    res.json(version);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/getmentors", async (req, res) => {
  try {
    const mentors = await getMentors();
    res.json(mentors);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/getmentor", async (req, res) => {
  const { id } = req.query; // Changed from req.body to req.query
  try {
    const mentor = await getMentor(id);
    if (!mentor) {
      return res.status(404).json({ error: "Mentor not found" });
    }
    res.json(mentor);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/getmentordata", ClerkExpressRequireAuth({}), async (req, res) => {
  if (!req.auth || !req.auth.userId) {
    return res.status(401).json({ error: "Unauthenticated!" });
  }

  try {
    // Fetch user data from Clerk
    const user = await clerkClient.users.getUser(req.auth.userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Fetch mentor ID based on Clerk user ID
    const mentorId = await getmentorid(user.id);
    if (!mentorId) {
      return res.status(404).json({ error: "Mentor ID not found" });
    }

    // Fetch mentor data using the mentor ID
    const mentor = await getMentor(mentorId);
    if (!mentor) {
      return res.status(404).json({ error: "Mentor not found" });
    }

    // Respond with mentor data
    res.json(mentor);
  } catch (err) {
    console.error("Error fetching mentor data:", err.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/sessionmentor", ClerkExpressRequireAuth({}), async (req, res) => {
  if (!req.auth || !req.auth.userId) {
    return res.status(401).json({ error: "Unauthenticated!" });
  }

  try {
    const user = await clerkClient.users.getUser(req.auth.userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const mentorId = await getmentorid(user.id);
    if (!mentorId) {
      return res.status(404).json({ error: "Mentor ID not found" });
    }

    const mentor = await getSessionMentor(mentorId);
    if (!mentor) {
      return res.status(404).json({ error: "Mentor session data not found" });
    }
    res.json(mentor);
  } catch (err) {
    console.error("Error in /sessionmentor route:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/sessionstudent", ClerkExpressRequireAuth({}), async (req, res) => {
  if (!req.auth || !req.auth.userId) {
    return res.status(401).json({ error: "Unauthenticated!" });
  }

  try {
    const user = await clerkClient.users.getUser(req.auth.userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const studentId = await getstudentid(user.id);
    if (!studentId) {
      return res.status(404).json({ error: "Student ID not found" });
    }

    const student = await getSessionStudent(studentId);
    if (!student) {
      return res.status(404).json({ error: "Student session data not found" });
    }

    res.json(student);
  } catch (err) {
    console.error("Error in /sessionstudent route:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post(
  "/payment-checkout",
  ClerkExpressRequireAuth({}),
  async (req, res) => {
    // Check authentication
    if (!req.auth || !req.auth.userId) {
      return res.status(401).json({ error: "Unauthenticated!" });
    }

    try {
      // Extract request body parameters
      const { time, role, duration, date } = req.body;

      // Fetch user details from Clerk
      const user = await clerkClient.users.getUser(req.auth.userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Find the mentor based on criteria
      const mentorId = await getperfectmentor(time, role, duration, date);
      if (!mentorId) {
        return res.status(404).json({ error: "No suitable mentor found" });
      }

      // Fetch full mentor data
      const mentor = await getfullmentordata(mentorId);
      if (!mentor) {
        return res
          .status(404)
          .json({ error: "Mentor not found for the specified criteria" });
      }

      // Determine the price based on duration
      let price;
      switch (duration.toLowerCase()) {
        case "30 min":
          price = 2000;
          break;
        case "45 min":
          price = 3000;
          break;
        case "60 min":
          price = 4000;
          break;
        default:
          return res.status(400).json({ error: "Invalid duration provided" });
      }

      // Fetch student ID
      const studentId = await getstudentid(user.id);
      if (!studentId) {
        return res.status(404).json({ error: "Student ID not found" });
      }

      // Create a payment record
      const paymentId = await getpaymentid(
        studentId,
        mentor.id,
        price,
        role,
        duration,
        date,
        time,
        mentor.email,
        user.emailAddresses[0].emailAddress
      );

      // Respond with the payment ID
      res.json({ paymentId });
    } catch (err) {
      // Handle unexpected errors
      console.error("Error processing payment checkout:", err.message);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

router.post(
  "/payment-checkout-premium",
  ClerkExpressRequireAuth({}),
  async (req, res) => {
    // Check authentication
    if (!req.auth || !req.auth.userId) {
      return res.status(401).json({ error: "Unauthenticated!" });
    }

    try {
      // Extract request body parameters
      const { time, role, duration, date, mentorId } = req.body;
      console.log("Request Parameters:", { time, role, duration, date });

      // Fetch user details from Clerk
      const user = await clerkClient.users.getUser(req.auth.userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const mentor = await getfullmentordata(mentorId);
      if (!mentor) {
        return res
          .status(404)
          .json({ error: "Mentor not found for the specified criteria" });
      }

      // Determine the price based on duration
      let price;
      switch (duration.toLowerCase()) {
        case "30 min":
          price = 2500;
          break;
        case "45 min":
          price = 3650;
          break;
        case "60 min":
          price = 4800;
          break;
        default:
          return res.status(400).json({ error: "Invalid duration provided" });
      }

      // Fetch student ID
      const studentId = await getstudentid(user.id);
      if (!studentId) {
        return res.status(404).json({ error: "Student ID not found" });
      }

      // Create a payment record
      const paymentId = await getpaymentid(
        studentId,
        mentorId,
        price,
        role,
        duration,
        date,
        time,
        mentor.email,
        user.emailAddresses[0].emailAddress
      );

      // Respond with the payment ID
      res.json({ paymentId });
    } catch (err) {
      // Handle unexpected errors
      console.error("Error processing payment checkout:", err.message);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

router.get("/payment", ClerkExpressRequireAuth({}), async (req, res) => {
  if (!req.auth || !req.auth.userId) {
    return res.status(401).json({ error: "Unauthenticated!" });
  }

  try {
    const { id } = req.query;
    if (!id) {
      return res.status(400).json({ error: "Payment ID is required" });
    }

    const user = await clerkClient.users.getUser(req.auth.userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const payment = await getpaymentbyid(id);

    if (payment.error) {
      return res.status(404).json({ error: payment.error });
    } else if (payment.message) {
      return res.status(200).json({ message: payment.message });
    }

    res.json(payment);
  } catch (err) {
    console.error("Error fetching payment data:", err.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/payment-done", ClerkExpressRequireAuth({}), async (req, res) => {
  if (!req.auth || !req.auth.userId) {
    return res.status(401).json({ error: "Unauthenticated!" });
  }

  try {
    const { id, check } = req.body;

    if (!id) {
      return res.status(400).json({ error: "Payment ID is required" });
    }

    if (!check || check !== "679543") {
      return res
        .status(400)
        .json({ error: "Payment not done or invalid check value" });
    }

    const user = await clerkClient.users.getUser(req.auth.userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const payment = await getpaymentDone(id);

    if (payment.error) {
      return res.status(404).json({ error: payment.error });
    } else if (payment.message) {
      return res.status(200).json({ message: payment.message });
    } else {
      return res.status(200).json({ message: "Payment Done" });
    }
  } catch (err) {
    // Handle unexpected errors
    console.error("Error processing payment:", err.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
