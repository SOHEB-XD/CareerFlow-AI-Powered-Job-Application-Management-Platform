const Application = require('../models/applications.model');

const addApplication = async (req, res) => {
    try {
        let { companyName, role, applicationSource, appliedDate, companyWebsite, hrEmail, notes } = req.body;
        const user = req.user;

        if (!companyName || !role || !applicationSource) {
            return res.status(400).json({ message: 'Please provide all the required fields' });
        }



        const normalizedCompany = companyName.trim().toLowerCase();
        const normalizedRole = role.trim().toLowerCase();

        const existingApplication = await Application.findOne({ normalizedCompany, normalizedRole, user: user._id });
        if (existingApplication) {
            return res.status(400).json({ message: 'Application already exists' });
        }

        const application = await Application.create({
            normalizedCompany,
            normalizedRole,
            companyName: companyName.trim(),
            role: role.trim(),
            applicationSource: applicationSource.trim(),
            appliedDate,
            companyWebsite: companyWebsite.trim(),
            hrEmail: hrEmail.trim(),
            notes: notes.trim(),
            user: user._id
        });

        if (!application) {
            return res.status(400).json({ message: 'Application not added' });
        }

        res.status(201).json({
            success: true,
            message: "Application created successfully",
            data: application
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { addApplication };