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
const uri = 'mongodb+srv://mateodrglin:2fw5CpPW@bdotracker.kyggydo.mongodb.net/?retryWrites=true&w=majority';

app.use(cors({
  origin: 'http://localhost:8080', // replace with your frontend server address
  credentials: true
}));
app.use(express.json()); 
//session
app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: true,
  store: MongoStore.create({ 
      mongoUrl: 'mongodb+srv://mateodrglin:2fw5CpPW@bdotracker.kyggydo.mongodb.net/?retryWrites=true&w=majority'
  })
}));
function ensureAuthenticated(req, res, next) {
  if (!req.session.userId) {
      return res.status(401).send({ message: "User not authenticated" });
  }
  next();
}


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

    const totals = await UserStats.aggregate([
      {
        $match: { userId: userId }
      },
      {
        $group: {
          _id: "$grindingSpotName",
          totalSilver: { $sum: "$total" }
        }
      }
    ]);

    res.status(200).json(totals);
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
