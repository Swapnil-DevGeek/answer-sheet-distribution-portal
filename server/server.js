const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const mongoose = require('mongoose');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const session = require('express-session');
const jwt = require('jsonwebtoken');
const User = require('./models/User');
dotenv.config();
const PORT = process.env.PORT || 8000;
const MONGO_URI = process.env.MONGO_URI;
const app = express();
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['Authorization', 'Content-Length']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
    secret: process.env.JWT_SECRET,
    resave: false,
    saveUninitialized: false
  }));

  app.use(passport.initialize());
  app.use(passport.session());

passport.serializeUser((user, done) => {
    done(null, user.id);
  });
  
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id);
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  });

  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: `${process.env.BACKEND_URL}/api/auth/google/callback`,
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      console.log('Google profile:', profile);
      
      const email = profile.emails[0].value;
      
      let user = await User.findOne({ email });
      
      if (user) {
        console.log('Existing user found:', user.email);
        return done(null, user);
      }
      
      const studentEmailPattern = /^f\d{4}\d{4}@goa\.bits-pilani\.ac\.in$/;
      const role = studentEmailPattern.test(email) ? 'student' : 'professor';
      
      console.log(`Assigning role '${role}' based on email pattern`);
      
      user = new User({
        name: profile.displayName || email.split('@')[0],
        email: email,
        googleId: profile.id,
        role: role, 
        isTa: false 
      });
      
      await user.save();
      console.log(`New user created with role '${role}':`, email);
      return done(null, user);
      
    } catch (error) {
      console.error('Error in Google auth strategy:', error);
      return done(error, null);
    }
  }
  ));

app.get('/api/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

app.get('/api/auth/google/callback', 
  passport.authenticate('google', { session: false }),
  async (req, res) => {
    try {
      const user = req.user;
      console.log('User authenticated:', user.email);
      
      const token = jwt.sign(
        {
          id: user._id,
          email: user.email,
          name: user.name || user.displayName || user.email.split('@')[0],
          role: user.role,
          isTa: user.isTa || false
        },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );
      
      console.log('JWT token created, redirecting to dashboard');
      
      const redirectUrl = `${process.env.FRONTEND_URL}/dashboard?token=${token}`;
      console.log('Redirecting to:', redirectUrl);
      
      res.redirect(redirectUrl);
    } catch (error) {
      console.error('Error in Google callback handler:', error);
      res.redirect(`${process.env.FRONTEND_URL}/?error=auth_failed`);
    }
  }
);

  app.post('/api/auth/fluttermkc',async (req,res)=>{
    try {
      const { email } = await req.body;
      console.log("email recieved : ",email);

      const user = await User.findOne({email});
      if(!user){
        const studentEmailPattern = /^f\d{4}\d{4}@goa\.bits-pilani\.ac\.in$/;
        const role = studentEmailPattern.test(email) ? 'student' : 'professor';

        user = new User({
          name: profile.displayName || email.split('@')[0],
          email: email,
          googleId: profile.id,
          role: role, 
          isTa: false 
        });
        
        await user.save();

      }

      console.log(user);

      const token = jwt.sign(
        {
          id: user._id,
          email: user.email,
          name: user.name || user.displayName || user.email.split('@')[0],
          role: user.role,
          isTa: user.isTa || false
        },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );
      
      return res.status(200).json({token});

    } catch (error) { 
      return res.status(500).json({
        message : error
      })
    }
  })
  
  app.use('/api/auth', require("./routes/authRoutes"));
  app.use('/api/users', require('./routes/userRoutes'));
  app.use('/api/courses', require('./routes/courseRoutes'));
  app.use('/api/courses', require('./routes/courseMemberRoutes'));
  app.use('/api/answersheets', require('./routes/answerSheetRoutes'));
  app.use('/api/rechecks', require('./routes/recheckRoutes'));
  
  mongoose.connect(MONGO_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.log(err));
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));