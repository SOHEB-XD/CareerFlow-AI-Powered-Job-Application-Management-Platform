const { GoogleGenerativeAI } = require("@google/generative-ai");
const Resume = require('../models/resume.model');
const Communication = require('../models/communication.model');
const Application = require('../models/applications.model');

const getTargetCompanyPreview = async (req, res) => {
    try {
        const { companyName, role, jobDescription, hrEmail } = req.body;
        const user = req.user;

        if (!companyName || !role) {
            return res.status(400).json({ success: false, message: 'Please provide company name and role' });
        }

        const applicationExist = await Application.findOne({
            user: user._id,
            companyName: companyName,
            role: role,
        });

        if (applicationExist) {
            return res.status(200).json({
                success: true,
                message: 'Application already exists for this company and role',
                data: applicationExist
            });
        }

        const existingDraft = await Communication.findOne({
            user: user._id,
            companyName: companyName,
            role: role,
            type: "application",
            status: "draft"
        });

        if (existingDraft) {
            return res.status(200).json({
                success: true,
                message: 'Application already exists for this company and role',
                cached: true,
                data: existingDraft
            });
        }


        const resume = await Resume.findOne({ user: user._id });

        if (!resume) {
            return res.status(400).json({ success: false, message: 'Resume not found' });
        }


        const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite" });

        let resumeText = resume.resumeText;


        const prompt = `

                        You are an expert technical recruiter and career assistant.

                        Generate a professional job application email for a candidate applying for a role.

                        Candidate Information:
                        Name: ${user.name}

                        Target Company:
                        Company Name: ${companyName}

                        Target Role:
                        ${role}

                        Job Description:
                        ${jobDescription || "Not provided"}

                        Candidate Resume:
                        ${resumeText}

                        Instructions:
                        - Write a professional and concise job application email.
                        - Highlight the candidate's most relevant skills and experience from the resume.
                        - Tailor the email to the provided role and job description.
                        - Mention the company name and role naturally.
                        - Keep the email between 150 and 250 words.
                        - Do not exaggerate skills or invent experience.
                        - Do not use generic filler sentences.
                        - Maintain a confident and professional tone.
                        - The email should be ready to send to a recruiter or hiring manager.
                        - Generate a relevant email subject line.

                        IMPORTANT:
                        Return ONLY valid JSON.
                        Do not wrap the response in markdown.
                        Do not include explanations.
                        Do not include comments.
                        Do not include any text before or after the JSON.

                        Expected JSON format:

                        {
                        "subject": "Application for [Role] Position",
                        "email": "Full email body here"
                        }`



        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = await response.text();

        const emailData = JSON.parse(text);

        await Communication.create({
            user: user._id,

            companyName: companyName,

            role: role,

            type: "application",

            subject: emailData.subject,

            body: emailData.email,

            hrEmail: hrEmail,

            status: "draft"
        });


        res.status(200).json({
            success: true,
            message: 'Target company email generated successfully',
            data: emailData
        });

    } catch (error) {

        res.status(500).json({ message: error.message });
    }


}


const getGmailLink = async (req, res) => {
    try {
        const user = req.user;
        const { id } = req.params;

        const communication =
            await Communication.findOne({
                _id: id,
                user: user._id
            });

        if (!communication) {
            return res.status(404).json({
                success: false,
                message: "Communication not found"
            });
        }

        const gmailUrl =
            `https://mail.google.com/mail/?view=cm&fs=1` +
            `&to=${encodeURIComponent(communication.hrEmail)}` +
            `&su=${encodeURIComponent(communication.subject)}` +
            `&body=${encodeURIComponent(communication.body)}`;

        res.status(200).json({
            success: true,
            gmailUrl
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

const markSend = async (req, res) => {
    try {
        const user = req.user;
        const { id } = req.params;

        const communication = await Communication.findOneAndUpdate({
            _id: id,
            user: user._id,
        }, {
            $set: {
                status: "sent",
                sentAt: new Date(),
            }
        }, {
            new: true
        });

        if (!communication) {
            return res.status(404).json({
                success: false,
                message: "Communication not found"
            });
        }

        const normalizedCompany = communication.companyName.toLowerCase().trim();
        const normalizedRole = communication.role.toLowerCase().trim();

        const application = await Application.create({
            user: user._id,
            normalizedCompany: normalizedCompany,
            normalizedRole: normalizedRole,
            companyName: communication.companyName,
            role: communication.role,
            status: "Applied",
            applicationSource: "Email",
            appliedDate: communication.sentAt,
            hrEmail: communication.hrEmail,
            notes: `No Notes`
        });

        res.status(200).json({
            success: true,
            message: "Communication marked as sent",
            application: application
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
}

module.exports = { getTargetCompanyPreview, getGmailLink, markSend };
