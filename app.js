// Required imports
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const app = express();

// Environment configuration
dotenv.config();
require("./db/conn");

// Middleware
app.use(cors({ origin: "http://localhost:3000", credentials: true }));
app.use(express.json());
app.use(cookieParser());

// Linking routers
app.use(require("./router/auth"));

// Constants
const PORT = process.env.PORT || 5000;

// Models
const Form = require("./models/formSchema");
const Response = require("./models/responseSchema");

// Routes
app.post("/add_questions", (req, res) => {
  const { document_name, doc_desc, questions, answers } = req.body;

  const form = new Form({
    document_name: document_name,
    doc_desc: doc_desc,
    questions: questions.map((question, index) => ({
      ...question,
      answer: answers[index],
    })),
  });

  form
    .save()
    .then(() => {
      res
        .status(200)
        .json({ success: true, message: "Form data saved successfully!" });
    })
    .catch((error) => {
      res
        .status(500)
        .json({
          success: false,
          message: "Failed to save form data",
          error: error,
        });
    });
});

app.get("/questions/latest", async (req, res) => {
  try {
    const recentForm = await Form.findOne().sort({ createdAt: -1 });
    if (!recentForm) {
      return res.status(404).json({ error: "No questions found" });
    }
    res.status(200).json(recentForm);
  } catch (error) {
    console.error("Error fetching questions:", error);
    res
      .status(500)
      .json({ error: "An error occurred while fetching questions" });
  }
});

app.post("/submit_responses", async (req, res) => {
  try {
    const { userName, answers, documentId } = req.body;
    const response = new Response({
      userName,
      documentId,
      answers,
    });

    await response.save();
    res
      .status(200)
      .json({ success: true, message: "Responses saved successfully!" });
  } catch (error) {
    console.error("Error saving responses:", error);
    res.status(500).json({ error: "An error occurred while saving responses" });
  }
});

app.get("/responses", async (req, res) => {
  try {
    const responses = await Response.find();
    res.json(responses);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get("/questions", async (req, res) => {
  try {
    const questions = await Form.find();
    if (questions.length === 0) {
      return res.status(404).json({ error: "No questions found" });
    }

    res.status(200).json(questions);
  } catch (error) {
    console.error("Error fetching questions:", error);
    res
      .status(500)
      .json({ error: "An error occurred while fetching questions" });
  }
});

app.get("/get_recent_forms", async (req, res) => {
  try {
    const recentForms = await Form.find().sort({ createdAt: -1 }).limit(10); // Get the 10 most recent forms
    res.status(200).json({ success: true, recentForms });
  } catch (error) {
    console.error("Error fetching recent forms:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch recent forms" });
  }
});

app.get("/get_form/:id", async (req, res) => {
  try {
    const formId = req.params.id;
    const form = await Form.findById(formId);
    if (!form) {
      return res.status(404).json({ error: "Form not found" });
    }
    res.status(200).json(form);
  } catch (error) {
    console.error("Error fetching form:", error);
    res.status(500).json({ error: "An error occurred while fetching form" });
  }
});

app.get("/data/:doc_id", async (req, res) => {
  try {
    const { doc_id } = req.params;
    const formData = await Form.findById(doc_id);
    if (!formData) {
      return res.status(404).json({ error: "Data not found" });
    }
    res.status(200).json(formData);
  } catch (error) {
    console.error("Error fetching data:", error);
    res.status(500).json({ error: "An error occurred while fetching data" });
  }
});

const path = require("path");
app.get("/get_all_filenames", (req, res) => {
  const directoryPath = path.join(__dirname, "/files");
  fs.readdir(directoryPath, function (err, files) {
    if (err) {
      return console.log("unable to scan directory" + err);
    }
    res.send(files);
  });
});

app.post("/generate_questions", (req, res) => {
  const { topicName, numQuestions } = req.body;
  const questions = [];

  // Generate 'numQuestions' questions
  for (let i = 0; i < numQuestions; i++) {
    const question = {
      id: uuidv4(),
      questionText: `Question ${i + 1}`,
      questionType: "radio",
      options: [{ optionText: "Option 1" }],
      open: true,
      required: false,
    };
    questions.push(question);
  }

  // Respond with the generated questions
  res.json({ questions });
});


const axios = require("axios");
const cheerio = require("cheerio");

app.get("/api/scrape", async (req, res) => {
  try {
    const { url } = req.query; // Get the URL from the query parameters
    if (!url) {
      return res.status(400).json({ error: "URL parameter is required." });
    }

    const response = await axios.get(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36",
      },
    });

    const $ = cheerio.load(response.data);
    const questions = [];

    const scrapeMCQs = (
      selector,
      questionTextSelector,
      optionsSelector,
      correctAnswerSelector
    ) => {
      const mcqContainers = $(selector);
      mcqContainers.each((index, container) => {
        const questionText = $(container)
          .find(questionTextSelector)
          .text()
          .trim();
        const options = $(container)
          .find(optionsSelector)
          .map((i, el) => $(el).text().trim())
          .get();
        const correctAnswer = $(container)
          .find(correctAnswerSelector)
          .text()
          .trim()
          .substring(8);

        questions.push({ questionText, options, correctAnswer });
      });
    };

    // Select elements that likely contain MCQs based on their structure
    const mcqContainers1 = $('div[class="mid-section"]').find("table");
    mcqContainers1.each((index, container) => {
      const questionText = $(container).find("td").eq(1).text().trim();
      const options = $(container)
        .find('input[type="radio"]')
        .map((i, el) => $(el).parent().text().trim())
        .get();
      const correctAnswer = $(container)
        .find('input[type="radio"]:checked')
        .parent()
        .text()
        .trim();
      questions.push({ questionText, options, correctAnswer });
    });

    const mcqContainers2 = $('p[class="pq"]');
    mcqContainers2.each((index, container) => {
      const questionText = $(container).text().trim();
      const options = $(container)
        .next()
        .find("li")
        .map((i, el) => $(el).text().trim())
        .get();
      const correctAnswer = $(container)
        .nextAll(".testanswer")
        .find('strong:contains("Answer:")')
        .next()
        .text()
        .trim();
      questions.push({ questionText, options, correctAnswer });
    });

    // For the third structure
    const mcqContainers3 = $(".QA .Q");
    mcqContainers3.each((index, container) => {
      const questionText =
        $(container).find("span").eq(0).text().trim() +
        " - " +
        $(container).find("p").eq(0).text().trim();
      const options = $(container)
        .find("a")
        .map((i, el) => $(el).text().trim().substring(3))
        .get();
      const correctAnswer = $(container)
        .find("a.true")
        .text()
        .trim()
        .substring(3);

      questions.push({ questionText, options, correctAnswer });
    });

    const mcqContainers4 = $(".question.single-question.question-type-normal");
    mcqContainers4.each((index, container) => {
      const questionText = $(container).find(".question-main").text().trim();
      const options = [];
      let correctAnswer = null;

      $(container)
        .find(".question-options p")
        .each((i, el) => {
          const optionText = $(el).text().trim();
          if (optionText.match(/^[A-D]\.\s/)) {
            options.push(optionText.substring(3));
          } else if (optionText.startsWith("Answer:")) {
            correctAnswer = optionText.substring(8).trim();
          }
        });

      questions.push({ questionText, options, correctAnswer });
    });

    res.json(questions);
  } catch (error) {
    console.error("Error scraping website:", error);
    res
      .status(500)
      .json({ error: "An error occurred while scraping the website." });
  }
});

app.listen(PORT, () => {
  console.log(`Server started at Port ${PORT}`);
});
