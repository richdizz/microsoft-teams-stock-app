require('dotenv').config();

import * as mongodb from 'mongodb';
import * as builder from 'botbuilder';
import * as teams from 'botbuilder-teams';
import {PortfolioItem} from './portfolioItem';

export class PortfolioAccount {
    constructor() {
        this.stocks = new Array<PortfolioItem>();
    }

    id:string;
    alt_id:string;
    name:string;
    stocks:Array<PortfolioItem>;

    update() {
        // update the user in the database
        let context = this;
        var mongoClient = mongodb.MongoClient;
        mongoClient.connect(<string>process.env.MONGO_CONN_STRING, (err:any, db:any) => {
            var x = db.collection('accounts').updateOne({ 'id': context.id }, context);
            db.close();
        });
    }

    static ensureAccount(session:builder.Session) {
        return new Promise((resolve, reject) => {
            // first fetch member list to get the user's profile (for 1:1 this will just be the user)
            var connector:teams.TeamsChatConnector = <teams.TeamsChatConnector>session.connector;
            connector.fetchMemberList(
                (<any>session.message.address).serviceUrl,
                (session.message.address.conversation) ? session.message.address.conversation.id : '',
                session.message.sourceEvent.tenant.id, (err:any, result:any) => {
                    if (err) {
                        reject('Error fetching members');
                    }
                    else {
                        let user:any;

                        // loop through the users and find the right match
                        for (var i = 0; i < result.length; i++) {
                            if (result[i].id == session.message.user.id) {
                                user = result[i];
                                break;
                            }
                        }
                        
                        // initialize the entity
                        var entity:PortfolioAccount = new PortfolioAccount();
                        
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
                        mongoClient.connect(<string>process.env.MONGO_CONN_STRING, (err:any, db:any) => {
                            // try to locate the user
                            var cursor = db.collection('accounts').find( { "id": entity.id } );
                            cursor.next((e:any, r:any) => {
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
                }
            );
        });
    }
}