const mongoose = require('mongoose');
const SpotPrice = require('./SpotPrice'); 

const uri = 'mongodb+srv://mateodrglin:2fw5CpPW@bdotracker.kyggydo.mongodb.net/?retryWrites=true&w=majority';

const spotsData = [
    {
        spotNumber: 1,
        items: [
            { itemName: "item1", price: 17500 },
            { itemName: "item2", price: 151000 },
            { itemName: "item3", price: 152000 },
            { itemName: "item4", price: 1050000 },
            { itemName: "item5", price: 2601000 },
            { itemName: "item6", price: 3000000 },
            { itemName: "item7", price: 9841740 },
            { itemName: "item8", price: 10000000 },
            { itemName: "item9", price: 19400 },
            { itemName: "item10", price: 50000 }
        ]
    },
    {
        spotNumber: 2,
        items: [
            { itemName: "item1_spot2", price: 18500 },
            { itemName: "item2", price: 151000 },
            { itemName: "item3", price: 152000 },
            { itemName: "item4", price: 1050000 },
            { itemName: "item5", price: 2601000 },
            { itemName: "item6", price: 3000000 },
            { itemName: "item7", price: 9841740 },
            { itemName: "item8", price: 10000000 },
            { itemName: "item9", price: 19400 },
            { itemName: "item10", price: 50000 }
        ]
    },
    {
        spotNumber: 3,
        items: [
            { itemName: "item1_spot3", price: 19000 },
            { itemName: "item2", price: 151000 },
            { itemName: "item3", price: 152000 },
            { itemName: "item4", price: 1050000 },
            { itemName: "item5_spot3", price: 3000000 },
            { itemName: "item6_spot3", price: 183000000 },
            { itemName: "item7_spot3", price: 14649855 },
            { itemName: "item8", price: 10000000 },
            { itemName: "item9_spot3", price: 135000 },
            { itemName: "item10", price: 50000 },
            { itemName: "item11_spot3", price: 30000 },
        ]
    },
];

async function addSpotsAndPrices() {
    const maxRetryAttempts = 5;
    let retryAttempts = 0;
  
    while (retryAttempts < maxRetryAttempts) {
      try {
        await SpotPrice.insertMany(spotsData);
        console.log("All spots and prices added successfully!");
        mongoose.connection.close();
        break; // Exit the loop on success
      } catch (error) {
        console.error("Error adding spots and prices:", error.message);
        if (retryAttempts < maxRetryAttempts - 1) {
          console.log(`Retrying... Attempt ${retryAttempts + 1}`);
          retryAttempts++;
          await new Promise(resolve => setTimeout(resolve, 5000)); // Retry after 5 seconds
        } else {
          console.log("Max retry attempts reached. Unable to add spots and prices.");
          mongoose.connection.close();
          break; // Exit the loop on max attempts
        }
      }
    }
  }
  // Add this code before performing the insertMany operation
mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })
.then(() => {
  console.log('Connected to MongoDB');
  addSpotsAndPrices(); // Call the function after successful connection
})
.catch(err => {
  console.error('Error connecting to MongoDB:', err);
});

  

addSpotsAndPrices();
