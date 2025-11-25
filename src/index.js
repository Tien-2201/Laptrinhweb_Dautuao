
const express = require('express');
const handlebars = require('express-handlebars');
const sections = require('express-handlebars-sections');
const path = require('path');
const morgan = require('morgan');
const session = require('express-session');
const app = express();
const port = 3000;

const route = require('./routes')

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, 'public')));

// HTTP logger
app.use(morgan('combined'));

//Template engine
app.engine('hbs', 
  handlebars.engine({
    extname: '.hbs',
    helpers: {
      section: sections(),
  },
}));
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'resources', 'views'));

// Session
app.use(session({
  secret: "mySecretKey",
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 24 * 60 * 60 * 1000,
    httpOnly: true,
  }
}));

// Expose session user to all views
app.use((req, res, next) => {
  res.locals.user = req.session.user;
  next();
});

//Route
route(app);

// Chạy server
app.listen(port, () => {
  console.log(`App listening on port ${port}`);
})