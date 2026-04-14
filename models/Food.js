const mongoose = require("mongoose");

const FoodSchema = new mongoose.Schema({
    restaurant: String,      // Name of restaurant/wedding hall
    location: String,        // Location/address
    quantity: Number,        // Quantity of food
    foodType: String,        // Veg or Non-Veg
    status: {                // Available or picked
        type: String,
        default: "Available"
    },
    deliveryTime: String     // Time food should be delivered
});

module.exports = mongoose.model("Food", FoodSchema);