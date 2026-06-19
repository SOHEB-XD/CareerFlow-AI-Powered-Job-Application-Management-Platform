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

const getAllApplication = async (req, res) => {
    try {
        const user = req.user;
        const { page = 1, limit = 5, search, status } = req.query;

        const pageNumber = parseInt(page);
        const limitNumber = parseInt(limit);

        const skip = (pageNumber - 1) * limitNumber;

        const filter = {
            user: user._id
        };

        if (search) {
            filter.$or = [
                {
                    companyName: {
                        $regex: search,
                        $options: "i"
                    }
                },
                {
                    role: {
                        $regex: search,
                        $options: "i"
                    }
                }
            ];
        }

        if (status) {
            filter.status = status;
        }



        const applications = await Application.find(filter).skip(skip).limit(limitNumber);

        if (applications.length === 0) {
            return res.status(404).json({ message: 'No applications found' });
        }

        res.status(200).json({
            success: true,
            message: 'Applications fetched successfully',
            data: applications
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getApplicationById = async (req, res) => {
    try {
        const user = req.user;
        const { id } = req.params;

        const application = await Application.findOne({ _id: id, user: user._id });

        if (!application) {
            return res.status(404).json({ message: 'Application not found' });
        }

        res.status(200).json({
            success: true,
            message: 'Application fetched successfully',
            data: application
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const updateApplication = async (req, res) => {
    try {
        const user = req.user;
        const { id } = req.params;
        const { companyName, role, status, applicationSource, appliedDate, companyWebsite, hrEmail, notes, interviewDate } = req.body;

        if (status === 'Interview Scheduled' && !interviewDate)
            return res.status(400).json({ message: 'Please Provide Interview Date' });

        const application = await Application.findOneAndUpdate({ _id: id, user: user._id }, { companyName, role, status, applicationSource, appliedDate, companyWebsite, hrEmail, notes, interviewDate }, { new: true, runValidators: true });

        if (application.length === 0) {
            return res.status(404).json({ message: 'Application not found' });
        }

        res.status(200).json({
            success: true,
            message: 'Application updated successfully',
            data: application
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }

};

const deleteApplication = async (req, res) => {
    try {
        const user = req.user;
        const { id } = req.params;

        const application = await Application.findOne({ _id: id, user: user._id });

        if (!application) {
            return res.status(404).json({ message: 'Application not found' });
        }

        await application.deleteOne();

        res.status(200).json({
            success: true,
            message: 'Application deleted successfully'
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const updateNoResponseStatus = async (req, res) => {
    try {
        const user = req.user;

        const tenDaysAgo = new Date();
        tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

        const applications = await Application.find({ user: user._id, status: "Applied", appliedDate: { $lt: tenDaysAgo } });

        if (applications.length === 0) {
            return res.status(200).json({ message: 'No application found' });
        }

        await Application.updateMany(
            { user: user._id, status: "Applied", appliedDate: { $lt: tenDaysAgo } },
            { $set: { status: 'No Response' } }
        );

        res.status(200).json({
            success: true,
            message: 'Application status updated successfully',
            data: {
                count: applications.length,
                applications
            }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getUpcomingInterviews = async (req, res) => {
    try {
        const user = req.user;

        const today = new Date();

        const applications = await Application.find({ user: user._id, status: 'Interview Scheduled', interviewDate: { $gte: today } })
            .sort({ interviewDate: 1 })
            .select('companyName role interviewDate');

        if (applications.length === 0) {
            return res.status(200).json({ message: 'No upcoming interviews found' });
        }


        res.status(200).json({
            success: true,
            message: 'Upcoming interviews fetched successfully',
            data: applications
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
module.exports = { addApplication, getAllApplication, getApplicationById, updateApplication, deleteApplication, updateNoResponseStatus, getUpcomingInterviews };