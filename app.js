require('dotenv').config()
const express = require('express')
const Flutterwave = require('flutterwave-node-v3')
const uniqID = require('uuid')
const app = express()
const bodyParser = require('body-parser')
const db = require('./db/database')
const port = process.env.PORT || 8080

const paystack = require('paystack')(process.env.LiveKey)
const flw = new Flutterwave(
  'FLWPUBK_TEST-74b92be8fae0fba09a82b22869ab4de6-X',
  'FLWSECK_TEST-ca82e022c235ca726336fe3a1aa9fc22-X',
)
app.use(bodyParser.json())
app.use(express.urlencoded({ extended: false }))

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', '*')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  next()
})
/**
 * install mongoose
 ***** build schema.
 * routes for payment
 *
 */

//  models
const userTickets = require('./models/ticketsmodel')
const vendorSales = require('./models/vendor')

app.get('/', (req, res, next) => {
  res.send('~~~~~~~ Home')
})

app.post('/makepayment', (req, res, next) => {
  const { fullname, email, phone, extra, totalprice, extras, event } = req.body
  const reference = `newTicketId-${uniqID.v1()}` // generate refe
  // service charge : 137.5
  let _totalprice = parseFloat(totalprice) + 137.5
  console.log(_totalprice)
  let data = {
    amount: _totalprice * 100,
    email,
    reference,
    callback_url: 'https://socialabujaapp.herokuapp.com/success',
    metadata: {
      customer_fields: [
        {
          fullname: fullname,
          phone: phone,
          email: email,
          nameofextras: extras,
          eventname: event,
          amountpaid: totalprice * 100,
        },
      ],
    },
  }

  console.log(data)

  const saveTicket = new userTickets({
    ticketId: reference,
    numOfPeople: extra,
    email: email,
  })
  saveTicket.save((e) => {
    if (e) console.log(e)
    else {
      paystack.transaction
        .initialize(data)
        .then((result) => {
          const { status, message } = result
          if (status) {
            const { authorization_url } = result.data
            res.redirect(authorization_url)
          } else res.send(message)
        })
        .catch((err) => {
          console.log(err)
        })
    }
  })
})

app.post('/collect', async (req, res) => {
  const payload = {
    card_number: '5531886652142950',
    cvv: '564',
    expiry_month: '09',
    expiry_year: '32',
    currency: 'NGN',
    amount: '100',
    redirect_url: 'https://www.google.com',
    fullname: 'Abiodun Mayowa',
    email: 'mayority11@gmail.com',
    phone_number: '08051985616',
    enckey: '611d0eda25a3c931863d92c4',
    tx_ref: uniqID.v1(),
  }

  try {
    const response = await flw.Charge.card(payload)
    console.log(response)
    if (response.meta.authorization.mode === 'pin') {
      let payload2 = payload
      payload2.authorization = {
        mode: 'pin',
        fields: ['pin'],
        pin: 3310,
      }
      const reCallCharge = await flw.Charge.card(payload2)
      console.log(reCallCharge)
      const callValidate = await flw.Charge.validate({
        otp: '12345',
        flw_ref: reCallCharge.data.flw_ref,
      })
      console.log(callValidate)
    }
    if (response.meta.authorization.mode === 'redirect') {
      var url = response.meta.authorization.redirect
      console.log('url ', url)
      // open(url)
    }

    console.log(response)
  } catch (error) {
    console.log(error)
  }
})

// transaction verification
app.get('/success', (req, res, next) => {
  paystack.transaction
    .verify(req.query.reference)
    .then((result) => {
      const { status, message } = result
      if (status) {
        const { data } = result
        const { paidAt, requested_amount } = data
        const {
          fullname,
          phone,
          email,
          nameofextras,
          eventname,
        } = data.metadata.customer_fields[0]

        userTickets.updateOne(
          { ticketId: req.query.reference, status: 'processing' },
          {
            fullname,
            phone,
            email,
            amountpaid: requested_amount / 100,
            event: eventname,
            status: 'successful',
            bought_for: nameofextras,
            date_: paidAt,
          },
          (err, resp) => {
            if (err) {
              console.log('Error', err)
              return
            }
            // redirect to successful page
            res.redirect('https://socialabujaapp.herokuapp.com/ticket')
          },
        )
      } else {
        //   display error on this page
        res.send(message)
      }
    })
    .catch((err) => {
      res.send('verification error :', err)
    })
})

app.get('/ticket', (req, res, next) => {
  res.redirect('http://socialabuja.com.ng/ticket')
})

app.get('/recentpayments', (req, res, next) => {
  userTickets.find(
    { status: 'successful' },
    'fullname email numOfPeople phone bought_for date_ ticketId',
    (err, docs) => {
      if (!err) res.json(docs)
      else res.json({ error: 'an error has occured + '.err })
    },
  )
})

// vendor plugins

app.get('/vendor', (req, res, next) => {
  paystack.transaction
    .verify(req.query.reference)
    .then((result) => {
      const { status, message } = result
      if (status) {
        const { data } = result
        const { paidAt, requested_amount } = data
        const {
          vendor,
          phone,
          email,
          eventname,
        } = data.metadata.customer_fields[0]

        vendorSales.updateOne(
          { ticketId: req.query.reference, status: 'processing' },
          {
            vendor,
            phone,
            email,
            amountpaid: requested_amount / 100,
            event: eventname,
            status: 'successful',
            date_: paidAt,
          },
          (err, resp) => {
            if (err) {
              console.log('Error', err)
              return
            }
            // redirect to successful page
            res.redirect('https://socialabujaapp.herokuapp.com/vendors')
          },
        )
      } else {
        //   display error on this page
        res.send(message)
      }
    })
    .catch((err) => {
      res.send('verification error :', err)
    })
})

app.post('/vendors', (req, res, next) => {
  const { vendor, email, phone, event } = req.body
  const reference = `VendorGetWet-${uniqID.v1()}` // generate refe

  let data = {
    amount: 15000 * 100,
    email,
    reference,
    callback_url: 'https://socialabujaapp.herokuapp.com/vendor',
    metadata: {
      customer_fields: [
        {
          vendor: vendor,
          phone: phone,
          email: email,
          eventname: event,
          amountpaid: 15000 * 100,
        },
      ],
    },
  }

  const saveTicket = new vendorSales({
    ticketId: reference,
    email: email,
    vendor: vendor,
  })
  saveTicket.save((e) => {
    if (e) console.log(e)
    else {
      paystack.transaction
        .initialize(data)
        .then((result) => {
          const { status, message } = result
          if (status) {
            const { authorization_url } = result.data
            res.redirect(authorization_url)
          } else res.send(message)
        })
        .catch((err) => {
          console.log(err)
        })
    }
  })
})

app.get('/vendors', (req, res, next) => {
  res.redirect('http://socialabuja.com.ng/vendors')
})

app.use(function (req, res, next) {
  res.status(404).send("Sorry can't find that!")
})

db.then((result) => {
  app.listen(port, () => {
    console.log('server is now live!')
  })
}).catch((err) => {
  console.log(err)
})
