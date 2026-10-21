const Communication = require('../models/communication.model');


const getCommunications = async (req, res) => {
    try {
        const user = req.user;
        const { page = 1, limit = 10, status } = req.query;

        const filter = { user: user._id };

        if (status) {
            filter.status = status;
        }

        const communications = await Communication.find(filter)
            .sort({
                createdAt: -1
            })
            .limit(limit)
            .skip((page - 1) * limit)
            .exec();

        const total = await Communication.countDocuments(filter);

        const paginatedData = {
            total,
            page,
            totalPages: Math.ceil(total / limit),
            data: communications
        };

        res.status(200).json({
            success: true,
            message: "Communications fetched successfully",
            data: paginatedData
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

module.exports = { getCommunications };
