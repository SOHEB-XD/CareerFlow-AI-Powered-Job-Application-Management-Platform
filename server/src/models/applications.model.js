const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
    companyName: {
        type: String,
        required: true,
        trim: true
    },
    role: {
        type: String,
        required: true,
        trim: true
    },
    status: {
        type: String,
        enum: ['Applied', 'Interview Scheduled', 'Technical Round', 'HR Round', 'Offer Letter', 'Rejected', 'Withdrawn'],
        default: 'Applied'
    },
    applicationSource: {
        type: String,
        required: true,
        trim: true
    },
    appliedDate: {
        type: Date,
        required: true,
        default: Date.now
    },
    companyWebsite: {
        type: String,
        trim: true
    },
    hrEmail: {
        type: String,
        trim: true,
        lowercase: true
    },
    notes: {
        type: String,
        maxlenght: 1500
    },
    interviewDate: {
        type: Date
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, { timestamps: true });

const Application = mongoose.model('Application', applicationSchema);

module.exports = Application;
