require('dotenv').config();
import * as Express from 'express';
import * as bodyParser from 'body-parser';
import * as session from 'express-session';
import * as https from 'https';
import * as http from 'http';
import * as path from 'path';
import * as morgan from 'morgan';
import * as builder from 'botbuilder';
import * as teams from 'botbuilder-teams';
import { stocks } from './stocks';
import { PortfolioAccountController } from './controllers/portfolioAccountController';
import { StockQuoteController } from './controllers/stockQuoteController';
import { StockSymbolController } from './controllers/stockSymbolController';

let express = Express();
let port = process.env.port || process.env.PORT || 3008;

express.use(bodyParser.json());
express.use(morgan('tiny'));
express.use('/scripts', Express.static(path.join(__dirname, 'scripts')));
express.use('/assets', Express.static(path.join(__dirname, 'web/assets')));


// Bot hosting 
let botSettings: builder.IChatConnectorSettings = {
    appId: process.env.MICROSOFT_APP_ID,
    appPassword: process.env.MICROSOFT_APP_PASSWORD
};

// Setup the Bot API controller
let bot = new stocks(new teams.TeamsChatConnector(botSettings));
express.post('/api/messages', bot.Connector.listen());

// Setup API controllers for the app
express.get('/api/account', PortfolioAccountController.getAccountSvc);
express.delete('/api/account/:id/:symbol', PortfolioAccountController.deleteStockSvc);
express.get('/api/quote/:symbol', StockQuoteController.getQuoteSvc);

// Load symbols into cache
StockSymbolController.getSymbols().then(function(data) {
    // Do nothing...just for cache
});

// This is used to prevent your tabs from being embedded in other systems than Microsoft Teams
express.use(function (req: any, res: any, next: any) {
    res.setHeader("Content-Security-Policy", "frame-ancestors teams.microsoft.com *.teams.microsoft.com *.skype.com");
    res.setHeader("X-Frame-Options", "ALLOW-FROM https://teams.microsoft.com/."); // IE11
    return next();
});

// Tabs (protected by the above)
express.use('/\*Tab.html', (req: any, res: any, next: any) => {
    res.sendFile(path.join(__dirname, `web${req.baseUrl}`));
});
express.use('/\*Config.html', (req: any, res: any, next: any) => {
    res.sendFile(path.join(__dirname, `web${req.baseUrl}`));
});
express.use('/\*Remove.html', (req: any, res: any, next: any) => {
    res.sendFile(path.join(__dirname, `web${req.baseUrl}`));
});

// Fallback
express.use(function (req: any, res: any, next: any) {
    res.removeHeader("Content-Security-Policy")
    res.removeHeader("X-Frame-Options"); // IE11
    return next();
});

express.use('/', Express.static(path.join(__dirname, 'web/'), {
    index: 'index.html'
}));

express.set('port', port);
http.createServer(express).listen(port, (err: any) => {
    if (err) {
        return console.error(err);
    }
    console.log(`Server running on ${port}`);
});
