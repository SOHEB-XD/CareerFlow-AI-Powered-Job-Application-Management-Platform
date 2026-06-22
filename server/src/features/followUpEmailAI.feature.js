const Application = require('../models/applications.model');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Communication = require('../models/communication.model');

const getFollowUpEmail = async (req, res) => {
    try {
        const user = req.user;
        const { id } = req.params;

        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const application = await Application.findOne({
            _id: id,
            user: user._id
        });

        if (!application) {
            return res.status(404).json({ message: 'No applications found' });
        }

        const existingFollowup = await Communication.findOne({
            application: application._id,
            type: "followup"
        });

        if (existingFollowup) {
            return res.status(200).json({
                message: "Follow-up Already Generated",
                success: true,
                cached: true,
                data: existingFollowup
            });
        }

        if (application.status !== 'Applied' || application.appliedDate > sevenDaysAgo) {
            return res.status(400).json({ message: 'You can only request a follow-up for applications that have been applied to for at least 7 days' });
        }

        const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite" });


        const prompt = `
                            You are a professional career assistant.

                            Generate a polite follow-up email for a job application.

                            My name is ${user.name}

                            Company Name: ${application.companyName}
                            Role: ${application.role}
                            Applied Date: ${application.appliedDate}

                            Requirements:
                            - Professional tone
                            - Maximum 150 words
                            - Express continued interest
                            - Ask for an update on the application
                            - Do not sound desperate
                            - Return ONLY raw JSON.
                            - Do not wrap the response in markdown.
                            - Do not include explanations.

                            Format:
                            {
                            "subject": "",
                            "email": ""
                            }
                            `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = await response.text();

        const emailData = JSON.parse(text);

        await Communication.create({
            application: application._id,
            user: user._id,
            type: "followup",
            subject: emailData.subject,
            body: emailData.email
        });


        res.status(200).json({
            success: true,
            message: 'Follow-up suggestions fetched successfully',
            data: emailData
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { getFollowUpEmail };