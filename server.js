const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const Food = require("./models/Food");
const NGO = require("./models/NGO");

const app = express();
// Middlewares
app.use(express.json());
app.use(cors());
app.use(express.static("public"));
//Connect to MongoDB
mongoose.connect("mongodb://127.0.0.1:27017/wastetowealth")
.then(()=> console.log("Database Connected"))
.catch(err=> console.log(err));


// POST FOOD DONATION
app.post("/donate", async (req,res)=>{
    const food = new Food(req.body);
    await food.save();
    res.json({message:"Food posted"});
});

// GET ALL FOOD
app.get("/food", async (req,res)=>{
    const foods = await Food.find();
    res.json(foods);
});

// REGISTER NGO
app.post("/ngo", async (req,res)=>{
    const ngo = new NGO(req.body);
    await ngo.save();
    res.json({message:"NGO registered"});
});

// GET ALL NGO
app.get("/ngo", async (req,res)=>{
    const ngos = await NGO.find();
    res.json(ngos);
});

// EMERGENCY MODE
app.post("/emergency",(req,res)=>{
    console.log("Emergency Mode Activated");
    res.json({message:"Emergency activated"});
});

app.listen(3000, ()=>{
    console.log("Server running on port 3000");
}); 