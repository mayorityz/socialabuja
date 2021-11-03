const mongoose = require("mongoose");
const ticketVendorSchema = new mongoose.Schema({
  vendor: String,
  email: String,
  phone: String,
  amountpaid: Number,
  ticketId: String,
  event: String,
  date_: String,
  status: { type: String, default: "processing" }
});
const VendorTickets = mongoose.model("vendor", ticketVendorSchema);
module.exports = VendorTickets;
