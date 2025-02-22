const express = require('express');
const router = express.Router();
const passport = require('passport');
const {login,register} = require("../controllers/authController");
const jwt = require('jsonwebtoken');

// Existing routes
router.post('/login', login);
router.post('/register', register);

// Google OAuth routes
router.get('/google',
  passport.authenticate('google', { 
    scope: ['profile', 'email'],
    session: false 
  })
);

router.get('/google/callback',
  passport.authenticate('google', { 
    session: false,
    failureRedirect: `${process.env.FRONTEND_URL}/login?error=google-auth-failed` 
  }),
  (req, res) => {
    try {
      const token = jwt.sign(
        { 
          id: req.user._id,
          roles: req.user.roles,
          activeRole: req.user.roles[0]
        },
        process.env.JWT_SECRET,
        { expiresIn: '1d' }
      );

      res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${token}`);
    } catch (error) {
      console.error('Token generation error:', error);
      res.redirect(`${process.env.FRONTEND_URL}/login?error=token-generation-failed`);
    }
  }
);

// Role switching route
router.post('/switch-role', (req, res) => {
  const { role } = req.body;
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return res.status(401).json({ message: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (!decoded.roles.includes(role)) {
      return res.status(403).json({ message: 'User does not have the requested role' });
    }

    const newToken = jwt.sign(
      { 
        id: decoded.id, 
        roles: decoded.roles,
        activeRole: role
      },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({ token: newToken });
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
});

module.exports = router;