
require('dotenv').config();
const express = require('express');
const handlebars = require('express-handlebars');
const sections = require('express-handlebars-sections');
const path = require('path');
const morgan = require('morgan');
const session = require('express-session');
const helmet = require('helmet');
const compression = require('compression');
const app = express();
const port = process.env.PORT || 3000;

const route = require('./routes');

// Basic security headers with a relaxed CSP to allow CDN assets used by the app
// Note: adjust allowed hosts to tighten policy for production.
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", 'https://cdn.jsdelivr.net', 'https://cdnjs.cloudflare.com'],
      scriptSrcElem: ["'self'", 'https://cdn.jsdelivr.net', 'https://cdnjs.cloudflare.com'],
      // allow inline event handlers (legacy inline onclick, etc.) — prefer nonces if possible
      scriptSrcAttr: ["'unsafe-inline'"],
      styleSrc: ["'self'", 'https://cdn.jsdelivr.net', "'unsafe-inline'"],
      connectSrc: ["'self'", 'https://api.coingecko.com', 'https://cdn.jsdelivr.net', 'https:'],
      imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
      fontSrc: ["'self'", 'https://cdn.jsdelivr.net', 'data:'],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    }
  }
}));

// Gzip compression for responses
app.use(compression());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, 'public')));

// HTTP logger: concise in dev, combined in production
if (process.env.NODE_ENV === 'production') {
  app.use(morgan('combined'));
} else {
  app.use(morgan('dev'));
}

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
const sessSecret = process.env.SESSION_SECRET || 'mySecretKey';
const isProd = process.env.NODE_ENV === 'production';
if (isProd) app.set('trust proxy', 1);

app.use(session({
  secret: sessSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 24 * 60 * 60 * 1000,
    httpOnly: true,
    secure: isProd, // send secure cookies in production
  }
}));

// Expose session user to all views
app.use((req, res, next) => {
  res.locals.user = req.session && req.session.user;
  next();
});

//Route
route(app);

// 404 handler
app.use((req, res) => {
  console.warn(`404 Not Found: ${req.method} ${req.url}`);
  res.status(404).send('Not Found');
});

// Generic error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).send('Server Error');
});

app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});
