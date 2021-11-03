const mongoose = require("mongoose");
const ticketSchema = new mongoose.Schema({
  fullname: String,
  email: String,
  phone: String,
  num_of_tickets: String,
  amountpaid: Number,
  bought_for: String,
  ticketId: String,
  event: String,
  date_: String,
  numOfPeople: Number,
  status: { type: String, default: "processing" }
});
const Tickets = mongoose.model("TicketHistory", ticketSchema);

module.exports = Tickets;
