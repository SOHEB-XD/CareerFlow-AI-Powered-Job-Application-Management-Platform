const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const dotenv = require("dotenv");
dotenv.config();
const authRoutes = require('./routes/auth.route');
const applicationRoutes = require('./routes/applications.route');
const featuresRoutes = require('./routes/features.route');

const app = express();
app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));
app.use(cookieParser());

app.use("/api/auth", authRoutes);
app.use("/api/applications", applicationRoutes);
app.use("/api/features", featuresRoutes);




module.exports = app
