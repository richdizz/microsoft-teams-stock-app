/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// identity function for calling harmony imports with the correct context
/******/ 	__webpack_require__.i = function(value) { return value; };
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, {
/******/ 				configurable: false,
/******/ 				enumerable: true,
/******/ 				get: getter
/******/ 			});
/******/ 		}
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 24);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, exports) {

module.exports = require("dotenv");

/***/ }),
/* 1 */
/***/ (function(module, exports) {

module.exports = require("request");

/***/ }),
/* 2 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
__webpack_require__(0).config();
const stockSymbol_1 = __webpack_require__(5);
const parse = __webpack_require__(3);
const request = __webpack_require__(1);
const cache = __webpack_require__(7);
class StockSymbolController {
    static getSymbolsForExchange(exchange) {
        return new Promise((resolve, reject) => {
            let array = new Array();
            request.get(`http://www.nasdaq.com/screening/companies-by-name.aspx?letter=0&exchange=${exchange}&render=download`, {}, (err, resp, body) => {
                // parse the results
                parse(resp.body, {}, (parse_error, output) => {
                    if (parse_error)
                        reject(parse_error);
                    else {
                        for (var i = 0; i < output.length; i++) {
                            array.push(new stockSymbol_1.StockSymbol(output[i][0], output[i][1]));
                        }
                        resolve(array);
                    }
                });
            });
        });
    }
    static getNameBySymbol(symbols, symbol) {
        var name = '';
        for (var i = 0; i < symbols.length; i++) {
            if (symbols[i].symbol === symbol) {
                name = symbols[i].company_name;
                break;
            }
        }
        return name;
    }
    static getSymbols() {
        return new Promise((resolve, reject) => {
            // first try to pull from cache
            let symbols = cache.get('symbols');
            if (symbols)
                resolve(symbols);
            else {
                // first get all nasdaq symbols
                let array = new Array();
                StockSymbolController.getSymbolsForExchange('nasdaq').then((nasdaq) => {
                    nasdaq.splice(0, 1); //remove header
                    array = array.concat(nasdaq);
                    // next get all nyse symbols
                    StockSymbolController.getSymbolsForExchange('nyse').then((nyse) => {
                        nyse.splice(0, 1); //remove header
                        array = array.concat(nyse);
                        // sort the array
                        var sortedArray = array.sort((o1, o2) => {
                            if (o1.symbol > o2.symbol)
                                return 1;
                            else if (o1.symbol < o2.symbol)
                                return -1;
                            else
                                return 0;
                        });
                        // cache the results for an hour and then return
                        cache.put('symbols', sortedArray, 3600000);
                        resolve(sortedArray);
                    });
                });
            }
        });
    }
}
exports.StockSymbolController = StockSymbolController;


/***/ }),
/* 3 */
/***/ (function(module, exports) {

module.exports = require("csv-parse");

/***/ }),
/* 4 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
__webpack_require__(0).config();
const stockQuote_1 = __webpack_require__(16);
const dateStat_1 = __webpack_require__(15);
const stockSymbolController_1 = __webpack_require__(2);
const request = __webpack_require__(1);
class StockQuoteController {
    static getQuoteSvc(req, res) {
        if (req.params.symbol) {
            let symbol = req.params.symbol;
            StockQuoteController.getQuote(symbol, req.query.showdetail).then((quote) => {
                res.json(quote);
            }, (err) => {
                res.status(500).send({ error: err });
            });
        }
        else
            res.status(500).send({ error: 'No symbol provided!' });
    }
    static getQuote(symbol, showdetail) {
        return new Promise((resolve, reject) => {
            if (symbol) {
                stockSymbolController_1.StockSymbolController.getSymbols().then((symbols) => {
                    let uri = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${symbol}&apikey=${process.env.STOCK_API_KEY}`;
                    request.get(uri, {}, (err, resp, body) => {
                        if (!err) {
                            var json = JSON.parse(body);
                            if (!json['Error Message']) {
                                let quote = new stockQuote_1.StockQuote();
                                quote.symbol = symbol;
                                quote.name = stockSymbolController_1.StockSymbolController.getNameBySymbol(symbols, symbol);
                                let index = 0;
                                for (var key in json['Time Series (Daily)']) {
                                    if (index == 0) {
                                        quote.current = json['Time Series (Daily)'][key]['4. close'];
                                        quote.volume = json['Time Series (Daily)'][key]['5. volume'];
                                    }
                                    else if (index == 1) {
                                        quote.prev_close = json['Time Series (Daily)'][key]['4. close'];
                                        break;
                                    }
                                    index++;
                                }
                                ;
                                quote.curr_change = quote.current - quote.prev_close;
                                quote.pct_change = (quote.current - quote.prev_close) / quote.prev_close;
                                // check if we should include the daily details
                                if (showdetail) {
                                    var dates = Object.keys(json['Time Series (Daily)']);
                                    for (var i = 0; i < dates.length; i++) {
                                        var item = json['Time Series (Daily)'][dates[i]];
                                        var stat = new dateStat_1.DateStat();
                                        stat.close = item['4. close'];
                                        stat.high = item['2. high'];
                                        stat.low = item['3. low'];
                                        stat.date = dates[i];
                                        quote.stats.push(stat);
                                    }
                                }
                                resolve(quote);
                            }
                            else {
                                reject(json['Error Message']);
                            }
                        }
                        else {
                            reject(err);
                        }
                    });
                }, (err) => {
                    reject(err);
                });
            }
            else
                reject('No symbol provided!');
        });
    }
}
exports.StockQuoteController = StockQuoteController;


/***/ }),
/* 5 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
class StockSymbol {
    constructor(s, n) {
        this.symbol = s;
        this.company_name = n;
    }
}
exports.StockSymbol = StockSymbol;


/***/ }),
/* 6 */
/***/ (function(module, exports) {

module.exports = require("botbuilder-teams");

/***/ }),
/* 7 */
/***/ (function(module, exports) {

module.exports = require("memory-cache");

/***/ }),
/* 8 */
/***/ (function(module, exports) {

module.exports = require("mongodb");

/***/ }),
/* 9 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
__webpack_require__(0).config();
const Express = __webpack_require__(20);
const bodyParser = __webpack_require__(18);
const http = __webpack_require__(21);
const path = __webpack_require__(23);
const morgan = __webpack_require__(22);
const teams = __webpack_require__(6);
const stocks_1 = __webpack_require__(17);
const portfolioAccountController_1 = __webpack_require__(11);
const stockQuoteController_1 = __webpack_require__(4);
const stockSymbolController_1 = __webpack_require__(2);
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


/***/ }),
/* 10 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
__webpack_require__(0).config();
const stockSymbol_1 = __webpack_require__(5);
const parse = __webpack_require__(3);
const request = __webpack_require__(1);
const cache = __webpack_require__(7);
class StockSymbolController {
    static getSymbolsForExchange(exchange) {
        return new Promise((resolve, reject) => {
            let array = new Array();
            request.get(`http://www.nasdaq.com/screening/companies-by-name.aspx?letter=0&exchange=${exchange}&render=download`, {}, (err, resp, body) => {
                // parse the results
                parse(resp.body, {}, (parse_error, output) => {
                    if (parse_error)
                        reject(parse_error);
                    else {
                        for (var i = 0; i < output.length; i++) {
                            array.push(new stockSymbol_1.StockSymbol(output[i][0], output[i][1]));
                        }
                        resolve(array);
                    }
                });
            });
        });
    }
    static getNameBySymbol(symbols, symbol) {
        var name = '';
        for (var i = 0; i < symbols.length; i++) {
            if (symbols[i].symbol === symbol) {
                name = symbols[i].company_name;
                break;
            }
        }
        return name;
    }
    static getSymbols() {
        return new Promise((resolve, reject) => {
            // first try to pull from cache
            let symbols = cache.get('symbols');
            if (symbols)
                resolve(symbols);
            else {
                // first get all nasdaq symbols
                let array = new Array();
                StockSymbolController.getSymbolsForExchange('nasdaq').then((nasdaq) => {
                    nasdaq.splice(0, 1); //remove header
                    array = array.concat(nasdaq);
                    // next get all nyse symbols
                    StockSymbolController.getSymbolsForExchange('nyse').then((nyse) => {
                        nyse.splice(0, 1); //remove header
                        array = array.concat(nyse);
                        // sort the array
                        var sortedArray = array.sort((o1, o2) => {
                            if (o1.symbol > o2.symbol)
                                return 1;
                            else if (o1.symbol < o2.symbol)
                                return -1;
                            else
                                return 0;
                        });
                        // cache the results for an hour and then return
                        cache.put('symbols', sortedArray, 3600000);
                        resolve(sortedArray);
                    });
                });
            }
        });
    }
}
exports.StockSymbolController = StockSymbolController;


/***/ }),
/* 11 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
__webpack_require__(0).config();
const mongodb = __webpack_require__(8);
const stockSymbolController_1 = __webpack_require__(2);
class PortfolioAccountController {
    static getAccountSvc(req, res) {
        if (req.query.id) {
            PortfolioAccountController.getAccount(req.query.id).then((acct) => {
                res.json(acct);
            }, (err) => {
                res.status(500).send({ error: err });
            });
        }
        else
            res.status(500).send({ error: 'No id provided!' });
    }
    static getAccount(id) {
        return new Promise((resolve, reject) => {
            if (id) {
                stockSymbolController_1.StockSymbolController.getSymbols().then((data) => {
                    var mongoClient = mongodb.MongoClient;
                    mongoClient.connect(process.env.MONGO_CONN_STRING, function (err, db) {
                        var cursor = db.collection('accounts').find({ 'id': id });
                        cursor.next(function (e, r) {
                            if (r) {
                                // return the account
                                for (var i = 0; i < r.stocks.length; i++)
                                    r.stocks[i].name = stockSymbolController_1.StockSymbolController.getNameBySymbol(data, r.stocks[i].symbol);
                                resolve(r);
                            }
                            else {
                                // return null
                                reject('No account found!');
                            }
                        });
                        db.close();
                    });
                });
            }
            else
                reject('No id provided!');
        });
    }
    static deleteStockSvc(req, res) {
        var mongoClient = mongodb.MongoClient;
        mongoClient.connect(process.env.MONGO_CONN_STRING, function (err, db) {
            var cursor = db.collection('accounts').find({ 'id': req.params.id });
            cursor.next(function (e, r) {
                if (r) {
                    // return the account
                    for (var i = 0; i < r.stocks.length; i++) {
                        if (r.stocks[i].symbol === req.params.symbol) {
                            r.stocks.splice(i, 1);
                            var x = db.collection('accounts').updateOne({ 'id': r.id }, r);
                            res.status(200).send();
                            break;
                        }
                    }
                    db.close();
                }
                else {
                    // return null
                    res.status(500).send({ error: 'Database connection error!' });
                    db.close();
                }
            });
        });
    }
}
exports.PortfolioAccountController = PortfolioAccountController;


/***/ }),
/* 12 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
__webpack_require__(0).config();
const mongodb = __webpack_require__(8);
class PortfolioAccount {
    constructor() {
        this.stocks = new Array();
    }
    update() {
        // update the user in the database
        let context = this;
        var mongoClient = mongodb.MongoClient;
        mongoClient.connect(process.env.MONGO_CONN_STRING, (err, db) => {
            var x = db.collection('accounts').updateOne({ 'id': context.id }, context);
            db.close();
        });
    }
    static ensureAccount(session) {
        return new Promise((resolve, reject) => {
            // first fetch member list to get the user's profile (for 1:1 this will just be the user)
            var connector = session.connector;
            connector.fetchMemberList(session.message.address.serviceUrl, (session.message.address.conversation) ? session.message.address.conversation.id : '', session.message.sourceEvent.tenant.id, (err, result) => {
                if (err) {
                    reject('Error fetching members');
                }
                else {
                    let user;
                    // loop through the users and find the right match
                    for (var i = 0; i < result.length; i++) {
                        if (result[i].id == session.message.user.id) {
                            user = result[i];
                            break;
                        }
                    }
                    // initialize the entity
                    var entity = new PortfolioAccount();
                    // check if this is an add for Team channel or individual
                    if (session.message.sourceEvent.teamsChannelId) {
                        // this is a Team channel
                        entity.id = session.message.sourceEvent.teamsChannelId;
                        entity.alt_id = session.message.sourceEvent.teamsTeamId;
                    }
                    else {
                        //this is an individual
                        entity.id = user.userPrincipalName;
                        entity.alt_id = user.id;
                        entity.name = user.name;
                    }
                    // ensure user is in database
                    var mongoClient = mongodb.MongoClient;
                    mongoClient.connect(process.env.MONGO_CONN_STRING, (err, db) => {
                        // try to locate the user
                        var cursor = db.collection('accounts').find({ "id": entity.id });
                        cursor.next((e, r) => {
                            if (r) {
                                // user exists so just populate stocks and resolve
                                entity.stocks = r.stocks;
                                resolve(entity);
                                db.close();
                            }
                            else {
                                // need to create a placeholder for the user
                                var x = db.collection('accounts').insertOne(entity);
                                resolve(entity);
                                db.close();
                            }
                        });
                    });
                }
            });
        });
    }
}
exports.PortfolioAccount = PortfolioAccount;


/***/ }),
/* 13 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
class PortfolioItem {
    constructor(symbol, user, date) {
        if (symbol)
            this.symbol = symbol;
        if (date)
            this.added_date = date;
        if (user) {
            this.added_by_id = user.id;
            this.added_by_name = user.name;
        }
    }
}
exports.PortfolioItem = PortfolioItem;


/***/ }),
/* 14 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
class StockQuote {
    constructor() {
        this.stats = new Array();
    }
}
exports.StockQuote = StockQuote;


/***/ }),
/* 15 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
class DateStat {
    constructor() {
    }
}
exports.DateStat = DateStat;


/***/ }),
/* 16 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
class StockQuote {
    constructor() {
        this.stats = new Array();
    }
}
exports.StockQuote = StockQuote;


/***/ }),
/* 17 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
__webpack_require__(0).config();
const builder = __webpack_require__(19);
const request = __webpack_require__(1);
const StockQuote_1 = __webpack_require__(14);
const stockQuoteController_1 = __webpack_require__(4);
const StockSymbolController_1 = __webpack_require__(10);
const PortfolioAccount_1 = __webpack_require__(12);
const PortfolioItem_1 = __webpack_require__(13);
const teams = __webpack_require__(6);
const parse = __webpack_require__(3);
/**
 * Implementation for Stocks
 */
class stocks {
    /**
     * The constructor
     * @param connector
     */
    constructor(connector) {
        this.Connector = connector;
        this.universalBot = new builder.UniversalBot(this.Connector);
        // Install sendTyping as middleware
        this.universalBot.use({
            botbuilder: (session, next) => {
                session.sendTyping();
                next();
            }
        });
        // Add dialogs here
        this.universalBot.dialog('/', this.defaultDialog);
        this.universalBot.dialog('/help', this.helpDialog);
        this.universalBot.dialog('/add', this.addDialog);
        this.universalBot.dialog('/remove', this.removeDialog);
        this.universalBot.dialog('/quote', this.quoteDialog);
        this.universalBot.dialog('/list', this.listDialog);
        // Handle conversationUpdate events
        this.universalBot.on('conversationUpdate', (activity) => {
            if (activity.sourceEvent &&
                activity.sourceEvent.eventType == 'teamMemberAdded' &&
                activity.membersAdded[0].id == activity.address.bot.id) {
                var botmessage = new builder.Message()
                    .address(activity.address)
                    .text(stocks.getHelpMsg());
                this.universalBot.send(botmessage, function (err) { });
            }
        });
        // Handle compose extension for searching stocks
        this.Connector.onQuery('searchCmd', (event, query, callback) => {
            // check if this is the initialRun of the extension
            if (query && query.parameters && query.parameters[0].name === 'initialRun') {
                // initial run...we don't use this given huge list of symbols
            }
            else {
                // start by getting all stock symbols and then we will filter down by query text
                StockSymbolController_1.StockSymbolController.getSymbols().then((data) => {
                    // get query parameters for paging and the query text
                    let q = query.parameters[0].value;
                    let skip = query.queryOptions.skip;
                    let cnt = query.queryOptions.count;
                    let filtered = data.filter(symbol => symbol.symbol.indexOf(q) == 0).splice(skip, cnt);
                    // get the last trade, change price, and change pct for each results
                    let symbols = filtered.map((a) => { return a.symbol; });
                    let symbols_str = symbols.join('+');
                    let uri = `http://finance.yahoo.com/d/quotes.csv?s=${symbols_str}&f=cl`;
                    request.get(uri, {}, (err, resp, body) => {
                        // Parse the results as csv
                        parse(resp.body, {}, (parse_error, output) => {
                            // Add stock quotes to each result
                            let attachments = [];
                            for (var i = 0; i < filtered.length; i++) {
                                // skip bad symbols
                                if (output[i][0].indexOf('N/A') == -1) {
                                    let change = output[i][0].split(' - ');
                                    change[0] = change[0].replace('+', '');
                                    change[1] = change[1].replace('%', '').replace('+', '');
                                    let last = output[i][1].split(' - ');
                                    last[1] = last[1].replace('<b>', '').replace('</b>', '');
                                    // convert StockSymbol to full StockQuote
                                    let quote = new StockQuote_1.StockQuote();
                                    quote.symbol = filtered[i].symbol;
                                    quote.name = filtered[i].company_name;
                                    quote.current = +last[1];
                                    quote.curr_change = +change[0];
                                    quote.pct_change = +change[1] / 100;
                                    attachments.push(stocks.formatQuoteCard(quote).toAttachment());
                                }
                            }
                            // Return result response
                            let response = teams.ComposeExtensionResponse.result('list')
                                .attachments(attachments)
                                .toResponse();
                            callback(null, response, 200);
                        });
                    });
                });
            }
        });
    }
    /**
     * This is the default dialog used by the bot...it routes to other dialogs
     * @param session
     */
    defaultDialog(session) {
        let text = stocks.extractTextFromMessage(session.message);
        if (text.startsWith('help')) {
            session.beginDialog('/help');
            return;
        }
        else if (text.startsWith('add ')) {
            session.beginDialog('/add');
            return;
        }
        else if (text.startsWith('remove ')) {
            session.beginDialog('/remove');
            return;
        }
        else if (text.startsWith('list')) {
            session.beginDialog('/list');
            return;
        }
        else {
            session.beginDialog('/quote');
            return;
        }
    }
    /**
     * This is the list dialog used by the bot...it displays all stocks in portfolio
     * @param session
     */
    listDialog(session) {
        PortfolioAccount_1.PortfolioAccount.ensureAccount(session).then((account) => {
            session.send(`Getting quotes for all ${account.stocks.length} stocks in your portfolio`);
            var msg = new builder.Message(session);
            msg.attachmentLayout(builder.AttachmentLayout.carousel);
            let cnt = 0;
            for (var i = 0; i < account.stocks.length; i++) {
                stocks.getQuoteCard(account.stocks[i].symbol, session, account).then((card) => {
                    msg.addAttachment(card);
                    cnt++;
                    if (cnt == account.stocks.length) {
                        session.send(msg);
                        session.endDialog();
                    }
                }, (err) => {
                    session.endDialog('Unknown stock symbol');
                });
            }
        }, (err) => {
            session.endDialog('Account not found');
        });
    }
    /**
     * This is the quote dialog of the bot that displays a stock quote for symbol
     * @param session
     */
    quoteDialog(session) {
        PortfolioAccount_1.PortfolioAccount.ensureAccount(session).then((account) => {
            let symbol = stocks.extractTextFromMessage(session.message);
            stocks.getQuoteCard(symbol, session, account).then((card) => {
                var msg = new builder.Message(session).addAttachment(card);
                session.send(msg);
                session.endDialog();
            }, (err) => {
                session.endDialog('Unknown stock symbol');
            });
        }, (err) => {
            session.endDialog('Account not found');
        });
    }
    /**
     * This is the add stock dialog of the bot...it adds a stock to a portfolio
     * @param session
     */
    addDialog(session) {
        // ensure the conversation isn't null
        if (session.message.address.conversation) {
            PortfolioAccount_1.PortfolioAccount.ensureAccount(session).then((account) => {
                let symbol = stocks.extractTextFromMessage(session.message).replace('add ', '').toUpperCase();
                // ensure the stock isn't already there
                let found = false;
                for (var i = 0; i < account.stocks.length; i++) {
                    if (account.stocks[i].symbol === symbol) {
                        found = true;
                        session.endDialog(`${symbol} was already in your portfolio`);
                        break;
                    }
                }
                if (!found) {
                    let item = new PortfolioItem_1.PortfolioItem(symbol, session.message.user, new Date());
                    account.stocks.push(item);
                    account.update();
                    // send the deep link to the item but only in a Channel
                    if (session.message.sourceEvent.teamsChannelId) {
                        let dl_context = encodeURIComponent(`{"subEntityId": "${symbol}", "canvasUrl": "https://stocks.ngrok.io/teamPortfolioTab.html", "channelId": "${session.message.sourceEvent.teamsChannelId}"}`);
                        let deeplink = `https://teams.microsoft.com/l/entity/f546297d-d54c-1009-a49a-efd66da91b2b/stocks?webUrl=${encodeURIComponent('https://www.cnbc.com/quotes/?symbol=' + symbol)}&label=${symbol}&context=${dl_context}`;
                        session.send(`${symbol} has been added to the team portfolio and can be viewed <a href="${deeplink}">here</a>`);
                    }
                    else {
                        session.send(`${symbol} has been added to your portfolio`);
                    }
                    session.endDialog();
                }
            }, (err) => {
                session.endDialog('Account not found');
            });
        }
        else
            session.endDialog('Bad message');
    }
    /**
     * This is the remove dialog of the bot...it removes a stock from a portfolio
     * @param session
     */
    removeDialog(session) {
        // ensure the conversation isn't null
        if (session.message.address.conversation) {
            PortfolioAccount_1.PortfolioAccount.ensureAccount(session).then((account) => {
                let symbol = stocks.extractTextFromMessage(session.message).replace('remove ', '').toUpperCase();
                let msg = '';
                for (var i = 0; i < account.stocks.length; i++) {
                    // ensure stock is already there
                    if (account.stocks[i].symbol === symbol) {
                        account.stocks.splice(i, 1);
                        msg = `${symbol} has been removed from your portfolio`;
                        // update the account in the database
                        account.update();
                        break;
                    }
                }
                if (msg === '')
                    msg = `${symbol} was not in your portfolio`;
                session.send(msg);
                session.endDialog();
            });
        }
        else
            session.endDialog('Bad message');
    }
    /**
     * This is the help dialog of the bot
     * @param session
     */
    helpDialog(session) {
        let msg = stocks.getHelpMsg();
        session.send(msg);
        session.endDialog();
    }
    /**
     * Extracts text only from messages, removing all entity references
     * @param message builder.IMessage
     */
    static extractTextFromMessage(message) {
        var s = (message.text) ? message.text : '';
        if (message.entities) {
            message.entities.forEach((ent) => {
                s = s.replace(ent.text, '');
            });
        }
        return s.trim();
    }
    /**
     * Builds a card for the stock
     * @param quote StockQuote
     */
    static getQuoteCard(symbol, session, account) {
        return new Promise((resolve, reject) => {
            stockQuoteController_1.StockQuoteController.getQuote(symbol).then((quote) => {
                let btn = builder.CardAction.imBack(session, `add ${quote.symbol}`, 'Add to portfolio');
                for (var i = 0; i < account.stocks.length; i++) {
                    if (account.stocks[i].symbol === symbol) {
                        btn = builder.CardAction.imBack(session, `remove ${quote.symbol}`, 'Remove from portfolio');
                    }
                }
                var card = stocks.formatQuoteCard(quote);
                // send the deep link to the item but only in a Channel
                if (session.message.sourceEvent.teamsChannelId) {
                    let dl_context = encodeURIComponent(`{"subEntityId": "${symbol}", "canvasUrl": "https://stocks.ngrok.io/teamPortfolioTab.html", "channelId": "${session.message.sourceEvent.teamsChannelId}"}`);
                    let deeplink = `https://teams.microsoft.com/l/entity/f546297d-d54c-1009-a49a-efd66da91b2b/stocks?webUrl=${encodeURIComponent('https://www.cnbc.com/quotes/?symbol=' + symbol)}&label=${symbol}&context=${dl_context}`;
                    card.buttons([
                        btn,
                        builder.CardAction.openUrl(session, deeplink, 'View details')
                    ]);
                }
                else
                    card.buttons([btn]);
                resolve(card.toAttachment());
            }, (err) => {
                reject(err);
            });
        });
    }
    /**
     * Formats a stock quote response
     * @param quote StockQuote
     */
    static formatQuoteCard(quote) {
        var color = (quote.curr_change == 0) ? 'black' : (quote.curr_change > 0) ? 'green' : 'red';
        var symbol = (quote.curr_change == 0) ? 'UNCH' : (quote.curr_change > 0) ? '&#9650;' : '&#9660;';
        return new builder.HeroCard()
            .title(`${quote.symbol} ${quote.current}`)
            .text(`<i><span style='color: ${color};'>${symbol} ${quote.curr_change.toFixed(3)} (${(quote.pct_change * 100).toFixed(3)}%)</span><br/>${quote.name}</i>`);
    }
    static getHelpMsg() {
        let msg = "The Stocks app for Microsoft Teams allows you to lookup near real-time stock information and build personal and team portfolios. Here are some of the commands you can send me:";
        msg += "<p><b>Command</b>: {symbol}<br/><b>Description</b>: Displays real-time quote for specified stock symbol<br/><b>Example</b>: @Stocks MSFT</p>";
        msg += "<p><b>Command</b>: detail {symbol}<br/><b>Description</b>: Displays detailed real-time quote for specified stock symbol<br/><b>Example</b>: @Stocks detail MSFT</p>";
        msg += "<p><b>Command</b>: add {symbol}<br/><b>Description</b>: Adds the specified stock to portfolio<br/><b>Example</b>: @Stocks add MSFT</p>";
        msg += "<p><b>Command</b>: remove {symbol}<br/><b>Description</b>: Removed the specified stock from portfolio<br/><b>Example</b>: @Stocks remove MSFT</p>";
        msg += "<p><b>Command</b>: list<br/><b>Description</b>: Lists all stocks in the portfolio<br/><b>Example</b>: @Stocks list</p>";
        return msg;
    }
}
exports.stocks = stocks;


/***/ }),
/* 18 */
/***/ (function(module, exports) {

module.exports = require("body-parser");

/***/ }),
/* 19 */
/***/ (function(module, exports) {

module.exports = require("botbuilder");

/***/ }),
/* 20 */
/***/ (function(module, exports) {

module.exports = require("express");

/***/ }),
/* 21 */
/***/ (function(module, exports) {

module.exports = require("http");

/***/ }),
/* 22 */
/***/ (function(module, exports) {

module.exports = require("morgan");

/***/ }),
/* 23 */
/***/ (function(module, exports) {

module.exports = require("path");

/***/ }),
/* 24 */
/***/ (function(module, exports, __webpack_require__) {

module.exports = __webpack_require__(9);


/***/ })
/******/ ]);
//# sourceMappingURL=server.js.map