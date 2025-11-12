const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const bodyParser = require("body-parser");
const { connectDB } = require("./src/config/db");
const userRoutes = require("./src/routes/users.routes");
const tripRoutes = require("./src/routes/trip.routes");
const adminRoutes = require("./src/routes/admin.routes");
const seatRoutes = require("./src/routes/seat.routes");
const managementRoutes = require("./src/routes/analytics.router");
const paymentRoutes = require("./src/routes/payment.routes");
const citiesRoutes = require('./src/routes/city.routes')

require("dotenv").config();
dotenv.config();

const app = express();

app.use(cors());
app.use(bodyParser.json());
app.use(express.json());

connectDB();

app.use("/api/users", userRoutes);
app.use("/api/trips", tripRoutes);
app.use("/api/admins", adminRoutes);
app.use("/api/seats", seatRoutes);
app.use("/api/admin-management", managementRoutes);
app.use("/api/pay", paymentRoutes);
app.use("/api/cities", citiesRoutes);

app.get("/", (req, res) => {
  res.send("🚀 API is running...");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
