const mongoose = require('mongoose');

const resumeSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },

        version: {
            type: Number,
            required: true,
            default: 1
        },

        isCurrent: {
            type: Boolean,
            default: false,
            index: true
        },

        originalFileName: {
            type: String,
            required: true,
            trim: true
        },

        resumeText: {
            type: String,
            required: true
        },

        note: {
            type: String,
            default: '',
            trim: true
        },

        targetCompany: {
            type: String,
            default: '',
            trim: true
        },

        targetRole: {
            type: String,
            default: '',
            trim: true
        },

        fileData: {
            type: Buffer,
            default: null
        },

        fileContentType: {
            type: String,
            default: 'application/pdf'
        },

        fileSize: {
            type: Number,
            default: 0
        },

        processingStatus: {
            type: String,
            enum: ['completed', 'pending', 'failed'],
            default: 'completed'
        }
    },
    { timestamps: true }
);

// Unique compound index ensuring version integrity per user
resumeSchema.index({ user: 1, version: 1 }, { unique: true });

const Resume = mongoose.model('Resume', resumeSchema);

module.exports = Resume;