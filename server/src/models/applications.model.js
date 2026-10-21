const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({

    normalizedCompany: {
        type: String,
        required: true,
        trim: true
    },
    normalizedRole: {
        type: String,
        required: true,
        trim: true
    },
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
        enum: ['Applied', 'Interview Scheduled', 'Technical Round', 'HR Round', 'Offer Letter', 'Rejected', 'Withdrawn', 'No Response'],
        default: 'Applied'
    },
    applicationSource: {
        type: String,
        required: true,
        trim: true,
        default: ''
    },
    appliedDate: {
        type: Date,
        required: true,
        default: Date.now
    },
    companyWebsite: {
        type: String,
        trim: true,
        default: ''
    },
    hrEmail: {
        type: String,
        trim: true,
        lowercase: true,
        default: ''
    },
    notes: {
        type: String,
        maxlenght: 1500,
        default: ''
    },
    interviewDate: {
        type: Date,
        default: null
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, { timestamps: true });

const Application = mongoose.model('Application', applicationSchema);

module.exports = Application;
