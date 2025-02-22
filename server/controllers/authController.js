const User = require("../models/User");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

// POST /api/auth/login
const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({email});
    if (!user ||!(await bcrypt.compare(password, user.password))) {
      return res.status(400).json({error: "Invalid email or password"});
    }
    const payload = {
      id: user._id,
      roles: user.roles,
      activeRole: user.roles[0] // Set initial active role
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {expiresIn: "1d"});

    res.status(200).json({token});
  } catch(err) {
    console.error(err);
    res.status(500).json({error: "Server Error"});
  }
};

const register = async (req, res) => {
  const { name, email, password, roles } = req.body;
  try {
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ message: 'User already exists' });
    }
    const hash_password = await bcrypt.hash(password, 10);

    user = new User({
      name,
      email,
      password: hash_password,
      roles
    });
  
    await user.save();
  
    const payload = { 
      id: user._id, 
      roles: user.roles,
      activeRole: user.roles[0]
    };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1d' });
    res.status(201).json({ token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};
module.exports = { register,login }