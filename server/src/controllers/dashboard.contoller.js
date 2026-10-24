const Application = require('../models/applications.model');

const getDashboardStats = async (req, res) => {
    try {
        const user = req.user;
        const applications = await Application.aggregate([
            {
                $match: {
                    user: user._id
                }
            },
            {
                $group: {
                    _id: null,
                    totalApplications: { $sum: 1 },
                    applied: { $sum: { $cond: [{ $eq: ["$status", "Applied"] }, 1, 0] } },
                    interviewScheduled: { $sum: { $cond: [{ $eq: ["$status", "Interview Scheduled"] }, 1, 0] } },
                    technicalRound: { $sum: { $cond: [{ $eq: ["$status", "Technical Round"] }, 1, 0] } },
                    hrRound: { $sum: { $cond: [{ $eq: ["$status", "HR Round"] }, 1, 0] } },
                    offerLetter: { $sum: { $cond: [{ $eq: ["$status", "Offer Letter"] }, 1, 0] } },
                    rejected: { $sum: { $cond: [{ $eq: ["$status", "Rejected"] }, 1, 0] } },
                    withdrawn: { $sum: { $cond: [{ $eq: ["$status", "Withdrawn"] }, 1, 0] } },
                    noResponse: { $sum: { $cond: [{ $eq: ["$status", "No Response"] }, 1, 0] } }
                }
            }
        ]);

        // Guard: no applications yet — return all-zero stats
        if (applications.length === 0) {
            return res.status(200).json({
                success: true,
                message: 'Dashboard stats fetched successfully',
                data: {
                    totalApplications: 0,
                    applied: 0,
                    interviewScheduled: 0,
                    technicalRound: 0,
                    hrRound: 0,
                    offerLetter: 0,
                    rejected: 0,
                    withdrawn: 0,
                    noResponse: 0
                }
            });
        }

        const { totalApplications, applied, technicalRound, hrRound, offerLetter, rejected, withdrawn, interviewScheduled, noResponse } = applications[0];

        res.status(200).json({
            success: true,
            message: 'Dashboard stats fetched successfully',
            data: {
                totalApplications,
                applied,
                interviewScheduled,
                technicalRound,
                hrRound,
                offerLetter,
                rejected,
                withdrawn,
                noResponse
            }
        });
    } catch (error) {
        console.error('[Dashboard getDashboardStats Error]:', error.message);
        res.status(500).json({ message: 'An unexpected internal error occurred' });
    }
};

const getRecentApplications = async (req, res) => {
    try {
        const user = req.user;
        const applications = await Application.aggregate([
            {
                $match: {
                    user: user._id
                }
            },
            {
                $sort: {
                    appliedDate: -1
                }
            },
            {
                $limit: 10
            }
        ]);

        res.status(200).json({
            success: true,
            message: 'Recent applications fetched successfully',
            data: applications
        });
    } catch (error) {
        console.error('[Dashboard getRecentApplications Error]:', error.message);
        res.status(500).json({ message: 'An unexpected internal error occurred' });
    }
};

module.exports = { getDashboardStats, getRecentApplications };