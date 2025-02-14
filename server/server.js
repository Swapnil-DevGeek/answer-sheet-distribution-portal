const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const mongoose = require('mongoose');

dotenv.config();
const PORT = process.env.PORT || 8000;
const MONGO_URI = process.env.MONGO_URI;
const app = express();
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000 || http://localhost:3001',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['Authorization', 'Content-Length']
}));

mongoose.connect(MONGO_URI)
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.log(err));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', require("./routes/authRoutes"));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/courses', require('./routes/courseRoutes'));
app.use('/api/courses', require('./routes/courseMemberRoutes'));
app.use('/api/answersheets', require('./routes/answerSheetRoutes'));
app.use('/api/rechecks', require('./routes/recheckRoutes'));

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));