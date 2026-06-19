const mongoose = require('mongoose');

const communicationSchema = new mongoose.Schema(
    {
        application: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Application",
            required: true
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

        sent: {
            type: Boolean,
            default: false
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