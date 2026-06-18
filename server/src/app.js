const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const dotenv = require("dotenv");
dotenv.config();
const authRoutes = require('./routes/auth.route');
const applicationRoutes = require('./routes/applications.route');
const dashboardRoutes = require('./routes/dashboard.route');

const app = express();
app.use(cors());
app.use(express.json());
app.use(cookieParser());

app.use("/api/auth", authRoutes);
app.use("/api/applications", applicationRoutes);
app.use("/api/dashboard", dashboardRoutes);



module.exports = app
