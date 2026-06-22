const Resume = require('../models/resume.model');

const uploadResume = async (req, res) => {
    const user = req.user;
    const { originalFileName, resumeText } = req.body;

    if (!originalFileName || !resumeText) {
        return res.status(400).json({ message: "Please provide both original file name and resume text" });
    }

    const existingResume = await Resume.findOne({ user: user._id });
    if (existingResume) {
        await existingResume.updateOne({ originalFileName, resumeText });
        return res.status(200).json({
            success: true,
            message: "Resume updated successfully",
            data: existingResume
        });
    }

    const resume = await Resume.create({
        user,
        originalFileName,
        resumeText
    });

    if (!resume) {
        return res.status(400).json({ message: "Resume not uploaded" });
    }

    res.status(201).json({
        success: true,
        message: "Resume uploaded successfully",
        data: resume
    });
};

module.exports = uploadResume;