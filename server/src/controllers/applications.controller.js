const Application = require('../models/applications.model');
const mongoose = require('mongoose');

const addApplication = async (req, res) => {
    try {
        let { companyName, role, applicationSource, appliedDate, companyWebsite, hrEmail, notes } = req.body;
        const user = req.user;

        if (
            !companyName || typeof companyName !== 'string' || !companyName.trim() ||
            !role || typeof role !== 'string' || !role.trim() ||
            !applicationSource || typeof applicationSource !== 'string' || !applicationSource.trim()
        ) {
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
            appliedDate: appliedDate || undefined,
            companyWebsite: typeof companyWebsite === 'string' ? companyWebsite.trim() : '',
            hrEmail: typeof hrEmail === 'string' ? hrEmail.trim() : '',
            notes: typeof notes === 'string' ? notes.trim() : '',
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

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'Invalid application ID' });
        }

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
        const { companyName, role, status, applicationSource, appliedDate, companyWebsite, hrEmail, notes, interviewDate } = req.body || {};

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'Invalid application ID' });
        }

        const existingApplication = await Application.findOne({ _id: id, user: user._id });
        if (!existingApplication) {
            return res.status(404).json({ message: 'Application not found' });
        }

        const interviewStatuses = ['Interview Scheduled', 'Technical Round', 'HR Round'];
        const nonInterviewStatuses = ['Applied', 'Offer Letter', 'Rejected', 'Withdrawn', 'No Response'];
        const isStatusChanging = status !== undefined && status !== existingApplication.status;
        const targetStatus = status !== undefined ? status : existingApplication.status;

        if (interviewStatuses.includes(targetStatus)) {
            if (isStatusChanging) {
                // Every transition to a different interview-related status must require a fresh, valid interviewDate
                if (interviewDate === undefined || interviewDate === null || interviewDate === '') {
                    return res.status(400).json({ message: 'Please Provide Interview Date' });
                }
                const parsedDate = new Date(interviewDate);
                if (isNaN(parsedDate.getTime())) {
                    return res.status(400).json({ message: 'Please Provide a valid Interview Date' });
                }
            } else {
                // Status not changing - if interviewDate is explicitly sent, it must be valid and non-empty
                if (interviewDate !== undefined) {
                    if (interviewDate === null || interviewDate === '') {
                        return res.status(400).json({ message: 'Please Provide Interview Date' });
                    }
                    const parsedDate = new Date(interviewDate);
                    if (isNaN(parsedDate.getTime())) {
                        return res.status(400).json({ message: 'Please Provide a valid Interview Date' });
                    }
                } else if (!existingApplication.interviewDate) {
                    return res.status(400).json({ message: 'Please Provide Interview Date' });
                }
            }
        }

        const updateData = {};
        if (companyName !== undefined) {
            updateData.companyName = typeof companyName === 'string' ? companyName.trim() : companyName;
            updateData.normalizedCompany = typeof companyName === 'string' ? companyName.trim().toLowerCase() : companyName;
        }
        if (role !== undefined) {
            updateData.role = typeof role === 'string' ? role.trim() : role;
            updateData.normalizedRole = typeof role === 'string' ? role.trim().toLowerCase() : role;
        }
        if (status !== undefined) {
            updateData.status = status;
            // Explicitly clear interviewDate when transitioning to or setting a non-interview status
            if (nonInterviewStatuses.includes(status)) {
                updateData.interviewDate = null;
            }
        }
        if (applicationSource !== undefined) updateData.applicationSource = typeof applicationSource === 'string' ? applicationSource.trim() : applicationSource;
        if (appliedDate !== undefined) updateData.appliedDate = appliedDate;
        if (companyWebsite !== undefined) updateData.companyWebsite = typeof companyWebsite === 'string' ? companyWebsite.trim() : '';
        if (hrEmail !== undefined) updateData.hrEmail = typeof hrEmail === 'string' ? hrEmail.trim() : '';
        if (notes !== undefined) updateData.notes = typeof notes === 'string' ? notes.trim() : '';
        if (interviewStatuses.includes(targetStatus) && interviewDate !== undefined) {
            updateData.interviewDate = interviewDate;
        }

        const application = await Application.findOneAndUpdate(
            { _id: id, user: user._id },
            updateData,
            { new: true, runValidators: true }
        );

        res.status(200).json({
            success: true,
            message: 'Application updated successfully',
            data: application
        });
    } catch (error) {
        if (error.name === 'CastError' || error.name === 'ValidationError') {
            return res.status(400).json({ message: error.message });
        }
        res.status(500).json({ message: error.message });
    }

};

const deleteApplication = async (req, res) => {
    try {
        const user = req.user;
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'Invalid application ID' });
        }

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
        if (error.name === 'CastError') {
            return res.status(400).json({ message: 'Invalid application ID' });
        }
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

        const applications = await Application.find({
            user: user._id,
            status: {
                $in: [
                    "Interview Scheduled",
                    "Technical Round",
                    "HR Round"
                ]
            },
            interviewDate: { $gte: today }
        })
            .sort({ interviewDate: 1 })
            .select('companyName role interviewDate');

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