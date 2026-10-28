const Application = require('../models/applications.model');
const mongoose = require('mongoose');

const addApplication = async (req, res) => {
    try {
        let { companyName, role, applicationSource, appliedDate, companyWebsite, hrEmail, notes, city } = req.body;
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
            city: typeof city === 'string' ? city.trim() : '',
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
        if (error.name === 'ValidationError') {
            return res.status(400).json({ message: error.message });
        }
        console.error('[Applications addApplication Error]:', error.message);
        res.status(500).json({ message: 'An unexpected internal error occurred' });
    }
};

const getAllApplication = async (req, res) => {
    try {
        const user = req.user;
        const { page = 1, limit = 5, search, status, fromDate, toDate, startDate, endDate, date, appliedDate, city } = req.query;

        const pageNumber = Math.max(parseInt(page) || 1, 1);
        const limitNumber = Math.min(Math.max(parseInt(limit) || 5, 1), 100);

        const skip = (pageNumber - 1) * limitNumber;

        const filter = {
            user: user._id
        };

        if (search && typeof search === 'string') {
            const sanitizedSearch = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            if (sanitizedSearch) {
                filter.$or = [
                    {
                        companyName: {
                            $regex: sanitizedSearch,
                            $options: "i"
                        }
                    },
                    {
                        role: {
                            $regex: sanitizedSearch,
                            $options: "i"
                        }
                    }
                ];
            }
        }

        if (status && typeof status === 'string') {
            filter.status = status;
        }

        if (city && typeof city === 'string') {
            const trimmedCity = city.trim();
            if (trimmedCity && trimmedCity !== 'All' && trimmedCity !== 'All cities') {
                const sanitizedCity = trimmedCity.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                filter.city = { $regex: `^${sanitizedCity}$`, $options: 'i' };
            }
        }

        // Helper to parse date boundaries safely with calendar component validation
        const parseDateBoundary = (val, isEnd = false) => {
            if (!val || typeof val !== 'string') return null;
            const trimmed = val.trim();
            if (!trimmed) return null;

            if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
                const [y, m, d] = trimmed.split('-').map(Number);
                const dateObj = new Date(Date.UTC(y, m - 1, d, isEnd ? 23 : 0, isEnd ? 59 : 0, isEnd ? 59 : 0, isEnd ? 999 : 0));
                if (dateObj.getUTCFullYear() !== y || dateObj.getUTCMonth() !== m - 1 || dateObj.getUTCDate() !== d) {
                    return { error: true };
                }
                return { date: dateObj };
            }

            const dateObj = new Date(trimmed);
            if (isNaN(dateObj.getTime())) {
                return { error: true };
            }
            if (isEnd) {
                dateObj.setUTCHours(23, 59, 59, 999);
            } else {
                dateObj.setUTCHours(0, 0, 0, 0);
            }
            return { date: dateObj };
        };

        const targetSingleDate = date || appliedDate;
        const rawFrom = targetSingleDate || fromDate || startDate;
        const rawTo = targetSingleDate || toDate || endDate;

        let parsedFrom = null;
        let parsedTo = null;

        if (rawFrom !== undefined && rawFrom !== '') {
            const result = parseDateBoundary(rawFrom, false);
            if (!result || result.error) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid fromDate format. Expected YYYY-MM-DD or valid date string.'
                });
            }
            parsedFrom = result.date;
        }

        if (rawTo !== undefined && rawTo !== '') {
            const result = parseDateBoundary(rawTo, true);
            if (!result || result.error) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid toDate format. Expected YYYY-MM-DD or valid date string.'
                });
            }
            parsedTo = result.date;
        }

        if (parsedFrom && parsedTo && parsedFrom > parsedTo) {
            return res.status(400).json({
                success: false,
                message: 'fromDate cannot be later than toDate'
            });
        }

        if (parsedFrom || parsedTo) {
            filter.appliedDate = {};
            if (parsedFrom) filter.appliedDate.$gte = parsedFrom;
            if (parsedTo) filter.appliedDate.$lte = parsedTo;
        }

        const [applications, total] = await Promise.all([
            Application.find(filter).skip(skip).limit(limitNumber),
            Application.countDocuments(filter)
        ]);

        const totalPages = Math.ceil(total / limitNumber);

        res.status(200).json({
            success: true,
            message: 'Applications fetched successfully',
            data: applications,
            total,
            totalPages,
            page: pageNumber,
            limit: limitNumber
        });
    } catch (error) {
        console.error('[Applications getAllApplication Error]:', error.message);
        res.status(500).json({ message: 'An unexpected internal error occurred' });
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
        if (error.name === 'CastError') {
            return res.status(400).json({ message: 'Invalid application ID' });
        }
        console.error('[Applications getApplicationById Error]:', error.message);
        res.status(500).json({ message: 'An unexpected internal error occurred' });
    }
};

const updateApplication = async (req, res) => {
    try {
        const user = req.user;
        const { id } = req.params;
        const { companyName, role, status, applicationSource, appliedDate, companyWebsite, hrEmail, notes, interviewDate, city } = req.body || {};

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
        if (city !== undefined) {
            updateData.city = typeof city === 'string' ? city.trim() : '';
        }
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
        console.error('[Applications updateApplication Error]:', error.message);
        res.status(500).json({ message: 'An unexpected internal error occurred' });
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
        console.error('[Applications deleteApplication Error]:', error.message);
        res.status(500).json({ message: 'An unexpected internal error occurred' });
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
        console.error('[Applications updateNoResponseStatus Error]:', error.message);
        res.status(500).json({ message: 'An unexpected internal error occurred' });
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
        console.error('[Applications getUpcomingInterviews Error]:', error.message);
        res.status(500).json({ message: 'An unexpected internal error occurred' });
    }
};

const getUserCities = async (req, res) => {
    try {
        const user = req.user;
        const rawCities = await Application.distinct('city', {
            user: user._id,
            city: { $nin: [null, '', undefined] }
        });

        const cityMap = new Map();
        for (const c of rawCities) {
            if (typeof c === 'string') {
                const trimmed = c.trim();
                if (trimmed) {
                    const lower = trimmed.toLowerCase();
                    if (!cityMap.has(lower)) {
                        cityMap.set(lower, trimmed);
                    }
                }
            }
        }

        const distinctCities = Array.from(cityMap.values()).sort((a, b) =>
            a.localeCompare(b, undefined, { sensitivity: 'base' })
        );

        res.status(200).json({
            success: true,
            message: 'User cities fetched successfully',
            data: distinctCities
        });
    } catch (error) {
        console.error('[Applications getUserCities Error]:', error.message);
        res.status(500).json({ message: 'An unexpected internal error occurred' });
    }
};

module.exports = {
    addApplication,
    getAllApplication,
    getApplicationById,
    updateApplication,
    deleteApplication,
    updateNoResponseStatus,
    getUpcomingInterviews,
    getUserCities
};