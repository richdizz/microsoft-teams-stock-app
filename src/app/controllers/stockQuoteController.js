"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require('dotenv').config();
const StockQuote_1 = require("../models/StockQuote");
const request = require("request");
class StockQuoteController {
    static getQuoteSvc(req, res) {
        if (req.params.symbol) {
            let symbol = req.params.symbol;
            StockQuoteController.getQuote(symbol).then((quote) => {
                res.json(quote);
            }, (err) => {
                res.status(500).send({ error: err });
            });
        }
        else
            res.status(500).send({ error: 'No symbol provided!' });
    }
    static getQuote(symbol) {
        return new Promise((resolve, reject) => {
            if (symbol) {
                let uri = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${symbol}&apikey=${process.env.STOCK_API_KEY}`;
                request.get(uri, {}, (err, resp, body) => {
                    var json = JSON.parse(body);
                    if (!json['Error Message']) {
                        let quote = new StockQuote_1.StockQuote();
                        quote.symbol = symbol;
                        let index = 0;
                        for (var key in json['Time Series (Daily)']) {
                            if (index == 0)
                                quote.current = json['Time Series (Daily)'][key]['4. close'];
                            else if (index == 1) {
                                quote.prev_close = json['Time Series (Daily)'][key]['4. close'];
                                break;
                            }
                            index++;
                        }
                        ;
                        quote.curr_change = quote.current - quote.prev_close;
                        quote.pct_change = (quote.current - quote.prev_close) / quote.prev_close;
                        resolve(quote);
                    }
                    else {
                        reject(json['Error Message']);
                    }
                });
            }
            else
                reject('No symbol provided!');
        });
    }
}
exports.StockQuoteController = StockQuoteController;
//# sourceMappingURL=stockQuoteController.js.map