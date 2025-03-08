const User = require("../models/User");
const bcrypt = require("bcrypt");

// GET /api/users/me
const getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select("-password");
        if (!user) return res.status(404).json({ msg: "User not found" });
        res.json(user);
    } catch (error) {
        console.error(error);
        res.status(500).send("Server Error");
    }
}

// PUT /api/users/me
const updateProfile = async (req, res) => {
    const { name, password } = req.body;
    const updates = {};
    if (name) updates.name = name;
    if (password) {
        updates.password = await bcrypt.hash(password, 10);
    }
    try {
    const user = await User.findByIdAndUpdate(req.user.id, updates, { new: true }).select('-password');
    if (!user) {
        return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
    } catch(error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// GET /api/users/professors
const getProfessors = async (req, res) => {
    try{
        const professors = await User.find({ role: 'professor' }).select('-password');
        res.json(professors);
    }catch(error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
}

// GET /api/users/students
const getStudents = async (req,res)=> {
    try{
        const students = await User.find({ role:'student' }).select('-password');
        res.json(students);
    }catch(error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
}

// GET /api/users/tas
    const getTAs = async (req,res)=> {
        try{
            const TAs = await User.find({ isTa : true }).select('-password');
            res.json(TAs);
        }catch(error) {
            console.error(error);
            res.status(500).json({ message: 'Server error' });
        }
    }

module.exports = {
    getProfile,
    updateProfile,
    getProfessors,
    getStudents,
    getTAs
};