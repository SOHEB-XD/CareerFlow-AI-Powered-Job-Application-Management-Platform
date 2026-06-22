const mongoose = require('mongoose');

const resumeSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        resumeText: {
            type: String,
            required: true
        },

        originalFileName: {
            type: String,
            required: true
        }
    },
    { timestamps: true });

const Resume = mongoose.model('Resume', resumeSchema);

module.exports = Resume;