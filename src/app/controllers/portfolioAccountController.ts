require('dotenv').config();

import * as mongodb from 'mongodb';
import {PortfolioAccount} from '../models/portfolioAccount';
import {StockSymbol} from '../models/StockSymbol';
import {StockSymbolController} from '../controllers/stockSymbolController';

export class PortfolioAccountController {
    static getAccountSvc(req:any, res:any) {
        if (req.query.id) {
            PortfolioAccountController.getAccount(req.query.id).then((acct:any) => {
                res.json(acct);
            }, (err:any) => {
                let acct:PortfolioAccount = new PortfolioAccount();
                acct.id = req.query.id;
                res.json(acct);
            });
        }
        else
            res.status(500).send({ error: 'No id provided!' });
    }
    
    static getAccount(id:string) {
        return new Promise((resolve, reject) => {
            if (id) {
                StockSymbolController.getSymbols().then((data:Array<StockSymbol>) => {
                    var mongoClient = mongodb.MongoClient;
                    mongoClient.connect(<string>process.env.MONGO_CONN_STRING, function (err:any, db:any) {                    
                        var cursor = db.collection('accounts').find({ 'id': id });
                        cursor.next(function (e:any, r:any) {
                            if (r) {
                                // return the account
                                for (var i = 0; i < r.stocks.length; i++)
                                    r.stocks[i].name = StockSymbolController.getNameBySymbol(data, r.stocks[i].symbol);
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

    static deleteStockSvc(req:any, res:any) {
        var mongoClient = mongodb.MongoClient;
        mongoClient.connect(<string>process.env.MONGO_CONN_STRING, function (err:any, db:any) {                    
            var cursor = db.collection('accounts').find({ 'id': req.params.id });
            cursor.next(function (e:any, r:any) {
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