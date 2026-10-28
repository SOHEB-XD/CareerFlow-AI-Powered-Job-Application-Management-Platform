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
        required: function () {
            return !this.googleId;
        },
        minlength: [6, 'Password must be at least 6 characters long'],
        maxlength: [100, 'Password must be less than 100 characters long']
    },
    googleId: {
        type: String,
        unique: true,
        sparse: true,
        trim: true
    },
    authProvider: {
        type: String,
        enum: ['local', 'google'],
        default: 'local'
    }
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

module.exports = User;  