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

// Get teaching assistants
const getTAs = async (req, res) => {
  try {
    const tas = await User.find({ isTa: true })
      .select('name email')
      .sort({ name: 1 });
    
    return res.status(200).json(tas);
  } catch (error) {
    console.error('Error fetching TAs:', error);
    return res.status(500).json({ message: 'Error fetching teaching assistants', error: error.message });
  }
};

// Get users with pagination and filtering
const getUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';
    const role = req.query.role || '';

    // Build query
    let query = {};
    
    // Add role filter if specified
    if (role) {
      if (role === 'ta') {
        query.isTa = true;
      } else {
        query.role = role;
      }
    }
    
    // Add search filter if specified
    if (search) {
      query = {
        ...query,
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ]
      };
    }

    // Get total count for pagination
    const total = await User.countDocuments(query);
    
    // Get users for current page
    const users = await User.find(query)
      .select('name email role isTa')
      .sort({ name: 1 })
      .skip(skip)
      .limit(limit);

    // Transform the data to include isTa in the role display
    const transformedUsers = users.map(user => {
      const userData = user.toObject();
      // If user is a TA, set role display to 'ta'
      if (userData.isTa) {
        userData.displayRole = 'ta';
      } else {
        userData.displayRole = userData.role;
      }
      return userData;
    });

    return res.status(200).json({
      users: transformedUsers,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      totalUsers: total
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return res.status(500).json({ message: 'Error fetching users', error: error.message });
  }
};

module.exports = {
    getProfile,
    updateProfile,
    getProfessors,
    getStudents,
    getTAs,
    getUsers
};