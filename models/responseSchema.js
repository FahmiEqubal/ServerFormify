const mongoose = require('mongoose');

const responseSchema = new mongoose.Schema({
  userName: { type: String, required: true },
  documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Form', required: true },
  answers: [
    {
      question: { type: String, required: true },
      answer: { type: String, required: true },
      isCorrect: { type: Boolean, required: true }
    }
  ]
}, { timestamps: true });

const Response = mongoose.model('Response', responseSchema);

module.exports = Response;
