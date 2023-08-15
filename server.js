const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');  
const UserStats = require('./models/UserStats');
const app = express();

// MongoDB Atlas Connection String
const uri = 'mongodb+srv://mateodrglin:2fw5CpPW@bdotracker.kyggydo.mongodb.net/?retryWrites=true&w=majority';

app.use(cors());  // cors
app.use(express.json()); 

app.post('/saveStats', async (req, res) => {
  try {
    const data = req.body;
    const newStat = new UserStats(data);
    await newStat.save();
    res.status(200).send({ message: "Data saved successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).send({ error: err.message });  // error log big
  }
});

mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected...'))
  .catch(err => console.log(err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
