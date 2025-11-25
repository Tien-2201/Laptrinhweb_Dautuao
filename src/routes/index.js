
const loginRouter = require("./login.js");
const homeRouter = require("./home.js");
const marketRouter = require("./market.js");
const portfolioRouter = require("./portfolio.js");
const tradingRouter = require("./trading.js");
const tradingApiRouter = require("./tradingApi.js");
const historyRouter = require("./history.js");
const profileRouter = require("./profile.js");

function route(app) {

    app.get('/', (req, res) => {
        return res.redirect('/home');
    });

    app.use("/home", homeRouter);
    
    app.use("/login", loginRouter);

    app.use("/market", marketRouter);

    app.use("/portfolio", portfolioRouter);

    app.use("/trading", tradingRouter);

    app.use("/api/trading", tradingApiRouter);
    
    app.use("/history", historyRouter);

    app.use("/profile", profileRouter);

};

module.exports = route;