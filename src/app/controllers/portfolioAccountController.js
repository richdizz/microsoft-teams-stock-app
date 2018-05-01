"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require('dotenv').config();
const mongodb = require("mongodb");
const portfolioAccount_1 = require("../models/portfolioAccount");
const stockSymbolController_1 = require("../controllers/stockSymbolController");
class PortfolioAccountController {
    static getAccountSvc(req, res) {
        if (req.query.id) {
            PortfolioAccountController.getAccount(req.query.id).then((acct) => {
                res.json(acct);
            }, (err) => {
                let acct = new portfolioAccount_1.PortfolioAccount();
                acct.id = req.query.id;
                res.json(acct);
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
//# sourceMappingURL=portfolioAccountController.js.map