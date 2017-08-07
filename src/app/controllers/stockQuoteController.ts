require('dotenv').config();

import {StockQuote} from '../models/stockQuote';
import {DateStat} from '../models/dateStat';
import {StockSymbol} from '../models/stockSymbol';
import {StockSymbolController} from './stockSymbolController';
import * as request from 'request';

export class StockQuoteController {
    static getQuoteSvc(req:any, res:any) {
        if (req.params.symbol) {
            let symbol = req.params.symbol;
            StockQuoteController.getQuote(symbol, req.query.showdetail).then((quote:StockQuote) => {
                res.json(quote);
            }, (err:any) => {
                res.status(500).send({ error: err });
            });
        }
        else
            res.status(500).send({ error: 'No symbol provided!' });
    }

    static getQuote(symbol:string, showdetail?:boolean) {
        return new Promise((resolve, reject) => {
            if (symbol) {
                StockSymbolController.getSymbols().then((symbols:Array<StockSymbol>) => {
                    let uri = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${symbol}&apikey=${process.env.STOCK_API_KEY}`;
                    request.get(uri, {}, (err, resp, body) => {
                        if (!err) {
                            var json = JSON.parse(body);
                            if (!json['Error Message']) {
                                let quote = new StockQuote();
                                quote.symbol = symbol;
                                quote.name = StockSymbolController.getNameBySymbol(symbols, symbol);
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
                                };

                                quote.curr_change = quote.current - quote.prev_close;
                                quote.pct_change = (quote.current - quote.prev_close) / quote.prev_close;
                                
                                // check if we should include the daily details
                                if (showdetail) {
                                    var dates = Object.keys(json['Time Series (Daily)']);
                                    for (var i = 0; i < dates.length; i++) {
                                        var item = json['Time Series (Daily)'][dates[i]];
                                        var stat:DateStat = new DateStat();
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
                                reject(json['Error Message'])
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