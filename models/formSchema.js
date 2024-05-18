const mongoose = require('mongoose');

const formSchema = new mongoose.Schema({
  document_name: String,
  doc_desc: String,
  questions: [{
    questionText: String,
    questionType: String,
    options: [String], // Assuming options are stored as strings
    answer: String, // Update to store the answer
    points: Number,
    required: Boolean,
  }],
  createdAt: { type: Date, default: Date.now }
});


const Form = mongoose.model('Form', formSchema);

module.exports = Form;