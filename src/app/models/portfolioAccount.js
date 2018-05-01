"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require('dotenv').config();
const mongodb = require("mongodb");
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
//# sourceMappingURL=PortfolioAccount.js.map