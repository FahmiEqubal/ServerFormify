const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const cookieParser = require("cookie-parser");
const authenticate = require("../middleware/authenticate");
const cors = require("cors");
const Form = require('../models/formSchema');
const User = require("../models/userSchema");

require("../db/conn");

// Create an instance of the Express application
const app = express();

// Middleware
app.use(cookieParser());

// Enable CORS for all routes
app.use(cors({
  origin: 'https://eformify.netlify.app', // Set the allowed origin
  credentials: true // Allow credentials
}));

router.get("/", (req, res) => {
  res.send("Hello World!!");
});

router.post("/register", async (req, res) => {
  const { name, email, phone, password, cpassword } = req.body;

  if (!name || !email || !phone || !password || !cpassword) {
    return res.status(422).json({ error: "Fill all the required fields" });
  }

  try {
    const userExist = await User.findOne({ email: email });

    if (userExist) {
      return res.status(422).json({ error: "Email already exists" });
    } else if (password !== cpassword) {
      return res.status(422).json({ error: "Passwords do not match" });
    } else {
      const user = new User({ name, email, phone, password, cpassword });
      await user.save();
      res.status(201).json({ message: "User registered successfully" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to register" });
  }
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return res.status(422).json({ error: "Fill all the required fields" });
    }

    const userLogin = await User.findOne({ email: email });

    if (userLogin) {
      const isMatch = await bcrypt.compare(password, userLogin.password);

      if (!isMatch) {
        return res.status(400).json({ error: "Invalid credentials" });
      }

      const token = await userLogin.generateAuthToken();

      res.cookie("jwtoken", token, {
        expires: new Date(Date.now() + 25892000000),
        httpOnly: true,
      });

      res.json({ message: "User signed in successfully" });
    } else {
      res.status(400).json({ error: "Invalid credentials" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to login" });
  }
});

router.get("/about", authenticate, (req, res) => {
  res.send(req.rootUser);
});

router.post("/contact", authenticate, async (req, res) => {
  try {
    const { name, email, phone, message } = req.body;

    if (!name || !email || !phone || !message) {
      console.error("Error in contact details");
      return res.json({ error: "Form not filled" });
    }

    const userContact = await User.findOne({ _id: req.userID });

    if (userContact) {
      const userMessage = await userContact.addMessage(
        name,
        email,
        phone,
        message
      );

      await userContact.save();

      res.status(201).json({ message: "Contact Message Submitted" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to submit contact message" });
  }
});

router.get("/logout", (req, res) => {
  console.log("User logged out");
  res.clearCookie("jwtoken", { path: "/" });
  res.status(200).send("User logged out");
});

router.post('/add_form', async (req, res) => {
  try {
    const formData = req.body;
    const newForm = new Form(formData);
    await newForm.save();
    res.status(201).send(newForm);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to add form" });
  }
});

module.exports = router;
