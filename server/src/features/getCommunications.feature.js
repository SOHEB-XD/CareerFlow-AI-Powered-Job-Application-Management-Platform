const Communication = require('../models/communication.model');


const getCommunications = async (req, res) => {
    try {
        const user = req.user;
        const { page = 1, limit = 10, status } = req.query;

        const pageNumber = Math.max(parseInt(page) || 1, 1);
        const limitNumber = Math.min(Math.max(parseInt(limit) || 10, 1), 50);

        const filter = { user: user._id };

        if (status && typeof status === 'string') {
            filter.status = status;
        }

        const communications = await Communication.find(filter)
            .sort({
                createdAt: -1
            })
            .limit(limitNumber)
            .skip((pageNumber - 1) * limitNumber)
            .exec();

        const total = await Communication.countDocuments(filter);

        const paginatedData = {
            total,
            page: pageNumber,
            totalPages: Math.ceil(total / limitNumber),
            data: communications
        };

        res.status(200).json({
            success: true,
            message: "Communications fetched successfully",
            data: paginatedData
        });
    } catch (error) {
        console.error('[Communications getCommunications Error]:', error.message);
        res.status(500).json({ message: 'An unexpected internal error occurred' });
    }
};

module.exports = { getCommunications };
