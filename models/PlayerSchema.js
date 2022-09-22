const mongoose = require("mongoose");

const PlayerSchema = new mongoose.Schema({
  _id: mongoose.Schema.Types.ObjectId,
  userID: String,
  level: { type: Number, default: 0 },
  xp: { type: Number, default: 0 }
});
module.exports = mongoose.model('Player', PlayerSchema);
