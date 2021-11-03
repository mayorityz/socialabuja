const mongoose_ = require('mongoose')
const password = 'socialabuja123@@@'
// const dbURL = `mongodb+srv://socialabuja:${password}@socialabuja-w9tpx.mongodb.net/socialabuja?retryWrites=true&w=majority`;
const dbURL = `mongodb://127.0.0.1:27017/socialAbuja`

module.exports = mongoose_.connect(dbURL, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
