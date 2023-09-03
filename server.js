const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const UserStats = require('./models/UserStats');
const User = require('./models/User');
const session = require('express-session');
const MongoStore = require('connect-mongo');

const app = express();

// MongoDB Atlas Connection String
const uri = 'mongodb+srv://mateodrglin:ngUaHJYlXKuDnoEY@bdotracker.kyggydo.mongodb.net/?retryWrites=true&w=majority';

app.use(cors({
  origin: 'https://front-end-gt-cjol.vercel.app',
  credentials: true
}));

app.use(express.json());

// Session setup
app.use(session({
  secret: 'GrindGT',
  resave: false,
  saveUninitialized: true,
  store: MongoStore.create({
    mongoUrl: 'mongodb+srv://mateodrglin:ngUaHJYlXKuDnoEY@bdotracker.kyggydo.mongodb.net/?retryWrites=true&w=majority'
  }),
  cookie: {
    maxAge: 1000 * 60 * 60 * 24, // 24 hours
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',  // in production, only transmit over HTTPS
    sameSite: 'none'
  }
}));


// Middleware to ensure the user is authenticated
function ensureAuthenticated(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).send({ message: "User not authenticated" });
  }
  next();
}

// Fetch user's email based on session ID
app.get('/user', ensureAuthenticated, async (req, res) => {
  try {
    const userId = req.session.userId;

    const user = await User.findById(userId);

    if (user) {
      res.status(200).json({ email: user.email });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// import.vue save
app.post('/saveStats', ensureAuthenticated, async (req, res) => {
  console.log("SaveStats payload:", req.body);
  try {
    const data = req.body;

    const userId = req.session.userId;

    if (!userId) {
      return res.status(400).send({ message: "User ID is required" });
    }

    // Ensure the user ID is a string
    data.userId = String(userId);

    const newStat = new UserStats(data);
    await newStat.save();
    res.status(200).send({ message: "Data saved successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).send({ error: err.message });
  }
});


// register
app.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Check if user with the same email exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log('Attempted to register with an already-existing email:', email);
      return res.status(400).send({ message: 'User with this email already exists.' });
    }

    const newUser = new User({
      username,
      email,
      password
    });

    await newUser.save();

    // Log the user in after registration
    req.session.userId = newUser._id;
    newUser.currentSessionId = req.sessionID;
    await newUser.save();

    res.status(201).send({ message: 'User registered and logged in successfully', userId: newUser._id });
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: 'Error registering user', error });
  }
});

// Login 
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  console.log("Attempting login for email:", email);
  // find email
  const user = await User.findOne({ email });

  if (!user) {
      return res.status(400).json({ message: 'Invalid email or password' });
  }

  // Compare pass w hash pass
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
      return res.status(400).json({ message: 'Invalid email or password' });
  }

  if (user.currentSessionId) {
      req.sessionStore.destroy(user.currentSessionId, (err) => {
          if (err) {
              console.error("Error destroying old session:", err);
          }
      });
  }

  // Save user ID to session to mark user as authenticated
  req.session.userId = user._id;
  console.log("Login successful. Session data:", req.session);
  // Set the new session ID in the user's document
  user.currentSessionId = req.sessionID;
  await user.save();

  res.json({ message: 'Login successful', userId: user._id });
});

app.get('/isAuthenticated', (req, res) => {
  console.log("Checking authentication. Session data:", req.session);

  if (req.session && req.session.userId) {
      console.log("User is authenticated.");
      res.json({ isAuthenticated: true });
  } else {
      console.log("User is not authenticated.");
      res.json({ isAuthenticated: false });
  }
});

//logout
app.delete('/logout', async (req, res) => {
  // Find the user based on the current session ID
  const user = await User.findOne({ currentSessionId: req.sessionID });

  if (user) {
      user.currentSessionId = null;
      await user.save();
  }
  req.session.destroy((err) => {
      if (err) return res.status(500).send("Error during logout.");
      res.send({ message: 'Logout successful' });
  });
});

// highest silver kinda like leaderboard
app.get('/highestTotalDiscountedSilver', ensureAuthenticated, async (req, res) => {
  try {
    const userId = req.session.userId;

    // Query the UserStats collection to get the highest "totalDiscounted" value for the authenticated user
    const highestTotalDiscountedSession = await UserStats.findOne({ userId: userId }).sort({ totalDiscounted: -1 }).limit(1);

    if (highestTotalDiscountedSession) {
      res.json({ highestTotalDiscountedSilver: highestTotalDiscountedSession.totalDiscounted });
    } else {
      res.json({ highestTotalDiscountedSilver: 0 });
    }
  } catch (error) {
    console.error("Error fetching highest Total Discounted Silver:", error);
    res.status(500).send({ message: 'Error fetching highest Total Discounted Silver' });
  }
});

//Chart i home
app.get('/totalsilver', ensureAuthenticated, async (req, res) => {
  try {
    const userId = req.session.userId;  // Pulling userId from session

    const totalsPerSpot = await UserStats.aggregate([
      {
        $match: { userId: userId }
      },
      {
        $group: {
          _id: "$grindingSpotName",
          totalSilver: { $sum: "$total" },
          totalDiscounted: { $sum: "$totalDiscounted" },
          averageSilver: { $avg: "$average" },
          totalHours: { $sum: "$hours" }
        }
      },
      {
        $project: {
          _id: 1,
          totalSilver: 1,
          totalDiscounted: 1,
          averageSilver: { $round: ["$averageSilver", 0] }, // Rounding here
          totalHours: 1
        }
      }
    ]);

    const accumulatedTotal = await UserStats.aggregate([
      {
        $match: { userId: userId }
      },
      {
        $group: {
          _id: null,
          totalSilver: { $sum: "$total" },
          totalDiscounted: { $sum: "$totalDiscounted" },
          averageSilver: { $avg: "$average" },
          totalHours: { $sum: "$hours" }
        }
      },
      {
        $project: {
          _id: 1,
          totalSilver: 1,
          totalDiscounted: 1,
          averageSilver: { $round: ["$averageSilver", 0] }, // Rounding here
          totalHours: 1
        }
      }
    ]);

    res.status(200).json({ totalsPerSpot, accumulatedTotal: accumulatedTotal[0] });
  } catch (error) {
    console.error("Error fetching total silver:", error);
    res.status(500).send({ message: 'Error fetching total silver' });
  }
});




mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected...'))
  .catch(err => console.log(err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});