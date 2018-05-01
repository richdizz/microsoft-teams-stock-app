"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require('dotenv').config();
const Express = require("express");
const bodyParser = require("body-parser");
const http = require("http");
const path = require("path");
const morgan = require("morgan");
const teams = require("botbuilder-teams");
const stocks_1 = require("./stocks");
const portfolioAccountController_1 = require("./controllers/portfolioAccountController");
const stockQuoteController_1 = require("./controllers/stockQuoteController");
const stockSymbolController_1 = require("./controllers/stockSymbolController");
let express = Express();
let port = process.env.port || process.env.PORT || 3008;
express.use(bodyParser.json());
express.use(morgan('tiny'));
express.use('/scripts', Express.static(path.join(__dirname, 'scripts')));
express.use('/assets', Express.static(path.join(__dirname, 'web/assets')));
// Bot hosting 
let botSettings = {
    appId: process.env.MICROSOFT_APP_ID,
    appPassword: process.env.MICROSOFT_APP_PASSWORD
};
// Setup the Bot API controller
let bot = new stocks_1.stocks(new teams.TeamsChatConnector(botSettings));
express.post('/api/messages', bot.Connector.listen());
// Setup API controllers for the app
express.get('/api/account', portfolioAccountController_1.PortfolioAccountController.getAccountSvc);
express.delete('/api/account/:id/:symbol', portfolioAccountController_1.PortfolioAccountController.deleteStockSvc);
express.get('/api/quote/:symbol', stockQuoteController_1.StockQuoteController.getQuoteSvc);
// Load symbols into cache
stockSymbolController_1.StockSymbolController.getSymbols().then(function (data) {
    // Do nothing...just for cache
});
// This is used to prevent your tabs from being embedded in other systems than Microsoft Teams
express.use(function (req, res, next) {
    res.setHeader("Content-Security-Policy", "frame-ancestors teams.microsoft.com *.teams.microsoft.com *.skype.com");
    res.setHeader("X-Frame-Options", "ALLOW-FROM https://teams.microsoft.com/."); // IE11
    return next();
});
// Tabs (protected by the above)
express.use('/\*Tab.html', (req, res, next) => {
    res.sendFile(path.join(__dirname, `web${req.baseUrl}`));
});
express.use('/\*Config.html', (req, res, next) => {
    res.sendFile(path.join(__dirname, `web${req.baseUrl}`));
});
express.use('/\*Remove.html', (req, res, next) => {
    res.sendFile(path.join(__dirname, `web${req.baseUrl}`));
});
// Fallback
express.use(function (req, res, next) {
    res.removeHeader("Content-Security-Policy");
    res.removeHeader("X-Frame-Options"); // IE11
    return next();
});
express.use('/', Express.static(path.join(__dirname, 'web/'), {
    index: 'index.html'
}));
express.set('port', port);
http.createServer(express).listen(port, (err) => {
    if (err) {
        return console.error(err);
    }
    console.log(`Server running on ${port}`);
});
//# sourceMappingURL=server.js.map