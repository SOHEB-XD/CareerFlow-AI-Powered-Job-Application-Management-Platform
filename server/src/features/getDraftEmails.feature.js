const Communication = require('../models/communication.model');

const getDraftFollowUpEmails = async (req, res) => {
    try {
        const user = req.user;

        const communications = await Communication.find({
            user: user._id,
            status: "draft",
            type: "followup"
        }).sort({
            appliedDate: 1
        }).populate("application", "companyName role appliedDate status");



        res.status(200).json({
            success: true,
            message: 'Draft emails fetched successfully',
            data: communications
        });
    } catch (error) {
        console.error('[DraftEmails getDraftFollowUpEmails Error]:', error.message);
        res.status(500).json({ message: 'An unexpected internal error occurred' });
    }
};

const getDraftApplicationEmails = async (req, res) => {
    try {
        const user = req.user;

        const communications = await Communication.find({
            user: user._id,
            status: "draft",
            type: "application"
        }).sort({
            appliedDate: 1
        }).populate("application", "companyName role appliedDate status");



        res.status(200).json({
            success: true,
            message: 'Draft emails fetched successfully',
            data: communications
        });
    } catch (error) {
        console.error('[DraftEmails getDraftApplicationEmails Error]:', error.message);
        res.status(500).json({ message: 'An unexpected internal error occurred' });
    }
};

module.exports = { getDraftFollowUpEmails, getDraftApplicationEmails };