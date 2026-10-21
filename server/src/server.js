const app = require("./app");
const dotenv = require("dotenv");
dotenv.config();

const connectDB = require("./config/db");

connectDB();


app.listen(process.env.PORT || 3000, () => {
    console.log(`Server is running on port ${process.env.PORT}`);
});