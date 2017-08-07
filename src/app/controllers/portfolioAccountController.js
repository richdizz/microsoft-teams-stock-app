"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require('dotenv').config();
const mongodb = require("mongodb");
const StockSymbol_1 = require("../models/StockSymbol");
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
                StockSymbol_1.StockSymbol.getSymbols().then((data) => {
                    var mongoClient = mongodb.MongoClient;
                    mongoClient.connect(process.env.MONGO_CONN_STRING, function (err, db) {
                        var cursor = db.collection('accounts').find({ 'id': id });
                        cursor.next(function (e, r) {
                            if (r) {
                                // return the account
                                for (var i = 0; i < r.stocks.length; i++)
                                    r.stocks[i].name = StockSymbol_1.StockSymbol.getNameBySymbol(data, r.stocks[i].symbol);
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
}
exports.PortfolioAccountController = PortfolioAccountController;
//# sourceMappingURL=portfolioAccountController.js.map