const mongoose = require('mongoose');
const { Schema } = mongoose;



const userSchema = new Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        trim: true,
        unique: true,
        lowercase: true,
        match: [/.+@.+\..+/, 'Please enter a valid email address']
    },
    password: {
        type: String,
        required: true,
        minlength: [6, 'Password must be at least 6 characters long'],
        maxlength: [100, 'Password must be less than 100 characters long'],

    }
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

module.exports = User;  