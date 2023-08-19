const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const UserStats = require('./models/UserStats');
const User = require('./models/User');

const session = require('express-session');
const SpotPrice = require('./models/SpotPrice');

const MongoStore = require('connect-mongo');


const app = express();

// MongoDB Atlas Connection String
const uri = 'mongodb+srv://mateodrglin:2fw5CpPW@bdotracker.kyggydo.mongodb.net/?retryWrites=true&w=majority';

app.use(cors({
  origin: 'http://localhost:8080', // replace with your frontend server address
  credentials: true
}));
app.use(express.json()); 

// Session setup
app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: true,
  store: MongoStore.create({ 
      mongoUrl: 'mongodb+srv://mateodrglin:2fw5CpPW@bdotracker.kyggydo.mongodb.net/?retryWrites=true&w=majority'
  })
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


      res.status(201).send({ message: 'User registered successfully' });
  } catch (error) {
      console.error(error);
      res.status(500).send({ message: 'Error registering user', error });
  } 
});
// Login 
app.post('/login', async (req, res) => {
  const { email, password } = req.body;

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

  // Save user ID to session to mark user as authenticated
  req.session.userId = user._id;

  res.json({ message: 'Login successful', userId: user._id});

});
app.get('/isAuthenticated', (req, res) => {
  if (req.session && req.session.userId) {
    res.json({ isAuthenticated: true });
  } else {
    res.json({ isAuthenticated: false });
  }
});
//logout
app.delete('/logout', (req, res) =>{
  req.session.destroy((err) => {
    if(err) return res.status(500).send("Error during logout.");
    res.send({ message: 'Logout successful' });
  });
});
//Chart
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
          averageSilver: { $avg: "$average" },
          totalHours: { $sum: "$hours" }
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
          averageSilver: { $avg: "$average" },
          totalHours: { $sum: "$hours" }
        }
      }
    ]);

    res.status(200).json({totalsPerSpot, accumulatedTotal: accumulatedTotal[0]});
  } catch (error) {
    console.error("Error fetching total silver:", error);
    res.status(500).send({ message: 'Error fetching total silver' });
  }
});
//saveprices
app.post('/savePrices', ensureAuthenticated, (req, res) => {
  const { spotNumber, items } = req.body;

  const spotPrice = new SpotPrice({
      spotNumber,
      items
  });

  spotPrice.save((err) => {
      if (err) {
          res.status(500).send('Failed to save prices.');
      } else {
          res.status(200).send('Prices saved successfully.');
      }
  });
});
//retrive data
app.get('/getPrices/:spotNumber?', ensureAuthenticated, async (req, res) => {
  const spotNumber = parseInt(req.params.spotNumber);
  
  if (isNaN(spotNumber) || spotNumber <= 0) {
    return res.status(400).json({ error: "Invalid spot number." });
  }
  try {
    let spotNumber = req.params.spotNumber;

    // Check if spotNumber is the string "null" or undefined
    if (!spotNumber || spotNumber === "null") {
      return res.status(400).json({ message: 'Spot number is missing or invalid.' });
    }

    // Convert spotNumber to a number
    spotNumber = parseInt(spotNumber, 10);

    let spotPrices;
    if (spotNumber) {
      spotPrices = await SpotPrice.findOne({ spotNumber: spotNumber });
    } else {
      spotPrices = await SpotPrice.find();
    }

    if (spotPrices) {
      res.status(200).json(spotPrices);
    } else {
      res.status(404).json({ message: 'Prices not found' });
    }
  } catch (error) {
    console.error("Error fetching prices:", error);
    res.status(500).send({ message: 'Error fetching prices' });
  }
});



//edit data
app.put('/updatePrices/:spotNumber', ensureAuthenticated, async (req, res) => {
  try {
      const spotNumber = req.params.spotNumber;
      const { items } = req.body;

      const spot = await SpotPrice.findOne({ spotNumber });

      if (!spot) {
          return res.status(404).send('Spot not found.');
      }

      spot.items = items;
      await spot.save();

      res.status(200).send('Prices updated successfully.');

  } catch (error) {
      console.error("Error updating prices:", error);
      res.status(500).send({ message: 'Error updating prices' });
  }
});


mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected...'))
  .catch(err => console.log(err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
