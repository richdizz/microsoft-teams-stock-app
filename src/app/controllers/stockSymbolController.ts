require('dotenv').config();

import {StockSymbol} from '../models/stockSymbol';
import * as parse from 'csv-parse';
import * as request from 'request';
import * as cache from 'memory-cache';

export class StockSymbolController {
    private static getSymbolsForExchange(exchange:string) {
        return new Promise((resolve, reject) => {
            let array = new Array<StockSymbol>();
            request.get(`https://www.nasdaq.com/screening/companies-by-name.aspx?letter=0&exchange=${exchange}&render=download`, { 
                headers: { 
                    "Accept": "application/text",
                    "user-Agent": "PostmanRuntime/7.1.1",
                    "Postman-Token": "6b84c8d4-4104-4318-8cc3-f92f58f12731"
                }}, (err, resp, body) => {
                // parse the results
                parse(resp.body, {}, (parse_error, output) => {
                    if (parse_error)
                        reject(parse_error);
                    else {
                        for (var i = 0; i < output.length; i++) {
                            array.push(new StockSymbol(output[i][0], output[i][1]));
                        }

                        resolve(array);
                    }
                });
            });
        });
    }

    static getNameBySymbol(symbols:Array<StockSymbol>, symbol:string) : string {
        var name:string = '';
        for (var i = 0; i < symbols.length; i++) {
            if (symbols[i].symbol === symbol){
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
                let array = new Array<StockSymbol>();
                StockSymbolController.getSymbolsForExchange('nasdaq').then((nasdaq:Array<StockSymbol>) => {
                    nasdaq.splice(0, 1); //remove header
                    array = array.concat(nasdaq);
                    
                    // next get all nyse symbols
                    StockSymbolController.getSymbolsForExchange('nyse').then((nyse:Array<StockSymbol>) => {
                        nyse.splice(0, 1); //remove header
                        array = array.concat(nyse);

                        // sort the array
                        var sortedArray:Array<StockSymbol> = array.sort((o1:StockSymbol, o2:StockSymbol) => {
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