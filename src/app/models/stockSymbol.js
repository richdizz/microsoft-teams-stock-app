"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const parse = require("csv-parse");
const request = require("request");
const cache = require("memory-cache");
class StockSymbol {
    constructor(s, n) {
        this.symbol = s;
        this.company_name = n;
    }
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
                            array.push(new StockSymbol(output[i][0], output[i][1]));
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
                StockSymbol.getSymbolsForExchange('nasdaq').then((nasdaq) => {
                    nasdaq.splice(0, 1); //remove header
                    array = array.concat(nasdaq);
                    // next get all nyse symbols
                    StockSymbol.getSymbolsForExchange('nyse').then((nyse) => {
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
exports.StockSymbol = StockSymbol;
//# sourceMappingURL=StockSymbol.js.map