const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const UserStats = require('./models/UserStats');
const User = require('./models/User');
const jwt = require('jsonwebtoken');

const app = express();
const SECRET_KEY = 'NODEGTTRACK';

// MongoDB Atlas Connection String
const uri = 'mongodb+srv://mateodrglin:LUoAMsWgAvdThREs@bdotracker.kyggydo.mongodb.net/?retryWrites=true&w=majority';
const corsOptions = {
  origin: 'https://front-end-gt-cjol.vercel.app',
  credentials: true 
};

app.use(cors(corsOptions));

  app.use(express.json());

const verifyToken = (req, res, next) => {
  const bearerHeader = req.headers['authorization'];
  if (typeof bearerHeader !== 'undefined') {const userId = req.userId;
      const bearer = bearerHeader.split(' ');
      const bearerToken = bearer[1];
      jwt.verify(bearerToken, 'NODEGTTRACK', (err, authData) => {
          if (err) {
              res.sendStatus(403); 
          } else {
              req.userId = authData.userId;
              next();
          }
      });
  } else {
      res.sendStatus(403);
  }
};

// Middleware to ensure the user is authenticated
function ensureAuthenticated(req, res, next) {
  const bearerHeader = req.headers['authorization'];
  if (typeof bearerHeader !== 'undefined') {
      const bearer = bearerHeader.split(' ');
      const bearerToken = bearer[1];
      jwt.verify(bearerToken, SECRET_KEY, (err, authData) => {
          if (err) {
              return res.status(403).send({ message: "Token is not valid" }); 
          } else {
              req.userId = authData.userId;
              next();
          }
      });
  } else {
      return res.status(403).send({ message: "Authorization token is missing" });
  }
}


// Fetch user's email based on session ID
app.get('/user', ensureAuthenticated, async (req, res) => {
  try {
    const userId = req.userId;

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
      
      const userId = req.userId;

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


      res.status(201).send({ message: 'User registered successfully' });
  } catch (error) {
      console.error(error);
      res.status(500).send({ message: 'Error registering user', error });
  } 
});
// Login route
app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    // Compare provided password with stored hash
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    // Sign a JWT token and send it in response
    const token = jwt.sign({ userId: user._id }, 'NODEGTTRACK', { expiresIn: '1h' });
    res.json({ token });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.get('/isAuthenticated', (req, res) => {
  const bearerHeader = req.headers['authorization'];
  if (!bearerHeader) return res.json({ isAuthenticated: false });

  const token = bearerHeader.split(' ')[1];
  jwt.verify(token, SECRET_KEY, (err, decoded) => {
    if (err) {
      console.error("JWT Verification Error:", err);
      return res.json({ isAuthenticated: false });
    }

    res.json({ isAuthenticated: true });
  });
});

// highest silver kinda like leaderboard
app.get('/highestTotalDiscountedSilver', ensureAuthenticated, async (req, res) => {
  try {
    const userId = req.userId;

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
    const userId = req.userId;
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

    res.status(200).json({totalsPerSpot, accumulatedTotal: accumulatedTotal[0]});
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