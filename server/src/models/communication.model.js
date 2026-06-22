const mongoose = require('mongoose');

const communicationSchema = new mongoose.Schema(
    {
        application: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Application"
        },

        companyName: {
            type: String
        },

        role: {
            type: String
        },

        hrEmail: {
            type: String
        },

        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        type: {
            type: String,
            enum: [
                "application",
                "followup",
                "thank_you",
                "feedback_request"
            ],
            required: true
        },

        subject: {
            type: String,
            required: true
        },

        body: {
            type: String,
            required: true
        },

        status: {
            type: String,
            enum: [
                "draft",
                "sent"
            ],
            default: "draft"
        },

        sentAt: {
            type: Date
        }
    },
    {
        timestamps: true
    });

const Communication = mongoose.model('Communication', communicationSchema);

module.exports = Communication;