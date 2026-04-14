const mongoose = require("mongoose");

const NGOSchema = new mongoose.Schema({
    name: String,       // NGO name
    area: String,       // Area / neighborhood
    volunteers: Number  // Number of volunteers
});

module.exports = mongoose.model("NGO", NGOSchema);