require('dotenv').config();
import * as builder from 'botbuilder';
import * as request from 'request';
import { StockQuote } from './models/StockQuote';
import { StockQuoteController } from './controllers/stockQuoteController';
import { StockSymbol } from './models/StockSymbol';
import { StockSymbolController } from './controllers/StockSymbolController';
import { PortfolioAccount } from './models/PortfolioAccount';
import { PortfolioItem } from './models/PortfolioItem';
import * as mongodb from 'mongodb';
import * as teams from 'botbuilder-teams';
import * as parse from 'csv-parse';

/**
 * Implementation for Stocks
 */
export class stocks {
    public readonly Connector: teams.TeamsChatConnector;
    private readonly universalBot: builder.UniversalBot;

    /**
     * The constructor
     * @param connector 
     */
    constructor(connector: teams.TeamsChatConnector) {
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
        this.universalBot.on('conversationUpdate', (activity: any) => {
            if (activity.sourceEvent && 
                activity.sourceEvent.eventType == 'teamMemberAdded' &&
                activity.membersAdded[0].id == activity.address.bot.id) {
                var botmessage = new builder.Message()
                    .address(activity.address)
                    .text(stocks.getHelpMsg());

                this.universalBot.send(botmessage, function(err) {});
            }
        });

        // Handle compose extension for searching stocks
        this.Connector.onQuery('searchCmd',
            (event: builder.IEvent, 
            query: teams.ComposeExtensionQuery,
            callback: (err: any, result: teams.IComposeExtensionResponse, statusCode: number) => void) => {
                // check if this is the initialRun of the extension
                if (query && query.parameters && query.parameters[0].name === 'initialRun') {
                    // initial run...we don't use this given huge list of symbols
                }
                else {
                    // start by getting all stock symbols and then we will filter down by query text
                    StockSymbolController.getSymbols().then((data:Array<StockSymbol>) => {
                        // get query parameters for paging and the query text
                        let q = (<any>query).parameters[0].value;
                        let skip = (<any>query.queryOptions).skip;
                        let cnt = (<any>query.queryOptions).count;
                        let filtered:Array<StockSymbol> = data.filter(symbol => symbol.symbol.indexOf(q) == 0).splice(skip, cnt);
                        
                        // get the last trade, change price, and change pct for each results
                        let symbols = filtered.map((a) => {return a.symbol;});
                        let symbols_str = symbols.join('+');
                        let uri = `http://finance.yahoo.com/d/quotes.csv?s=${symbols_str}&f=cl`
                        request.get(uri, {}, (err, resp, body) => {
                            // Parse the results as csv
                            parse(resp.body, {}, (parse_error, output) => {
                                // Add stock quotes to each result
                                let attachments:any = [];
                                for (var i = 0; i < filtered.length; i++) {
                                    // skip bad symbols
                                    if (output[i][0].indexOf('N/A') == -1) {
                                        let change = output[i][0].split(' - ');
                                        change[0] = change[0].replace('+', '');
                                        change[1] = change[1].replace('%', '').replace('+', '');
                                        let last = output[i][1].split(' - ');
                                        last[1] = last[1].replace('<b>', '').replace('</b>', '');

                                        // convert StockSymbol to full StockQuote
                                        let quote = new StockQuote();
                                        quote.symbol = filtered[i].symbol;
                                        quote.name = filtered[i].company_name;
                                        quote.current = +last[1];
                                        quote.curr_change = +change[0];
                                        quote.pct_change = +change[1]/100;
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
    defaultDialog(session: builder.Session) {
        let text = stocks.extractTextFromMessage(session.message);
        console.log(text);
        if (text.startsWith('help')) {
            session.beginDialog('/help');
            return;
        } else if (text.startsWith('add ')) {
            session.beginDialog('/add');
            return;
        } else if (text.startsWith('remove ')) {
            session.beginDialog('/remove');
            return;
        } else if (text.startsWith('list')) {
            session.beginDialog('/list');
            return;
        }   else {
            session.beginDialog('/quote');
            return;
        }   
    }

    /**
     * This is the list dialog used by the bot...it displays all stocks in portfolio
     * @param session 
     */
    listDialog(session: builder.Session) {
        PortfolioAccount.ensureAccount(session).then((account:PortfolioAccount) => {
            session.send(`Getting quotes for all ${account.stocks.length} stocks in your portfolio`);
            var msg = new builder.Message(session);
            msg.attachmentLayout(builder.AttachmentLayout.carousel);
            let cnt = 0;
            for (var i = 0; i < account.stocks.length; i++) {
                stocks.getQuoteCard(account.stocks[i].symbol, session, account).then((card:builder.HeroCard) => {
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
    quoteDialog(session: builder.Session) {
        PortfolioAccount.ensureAccount(session).then((account:PortfolioAccount) => {
            let symbol = stocks.extractTextFromMessage(session.message);
            stocks.getQuoteCard(symbol, session, account).then((card:builder.HeroCard) => {
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
    addDialog(session: builder.Session) {
        // ensure the conversation isn't null
        if (session.message.address.conversation) {
            PortfolioAccount.ensureAccount(session).then((account:PortfolioAccount) => {
                let symbol = stocks.extractTextFromMessage(session.message).replace('add ', '').toUpperCase();
                // ensure the stock isn't already there
                let found:boolean = false;
                for (var i = 0; i < account.stocks.length; i++) {
                    if (account.stocks[i].symbol === symbol) {
                        found = true;
                        session.endDialog(`${symbol} was already in your portfolio`);
                        break;
                    }
                }

                if (!found) {
                    let item:PortfolioItem = new PortfolioItem(symbol, session.message.user, new Date());
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
    removeDialog(session: builder.Session) {
        // ensure the conversation isn't null
        if (session.message.address.conversation) {
            PortfolioAccount.ensureAccount(session).then((account:PortfolioAccount) => {
                let symbol = stocks.extractTextFromMessage(session.message).replace('remove ', '').toUpperCase();
                let msg:string = '';
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
    helpDialog(session: builder.Session) {
        let msg = stocks.getHelpMsg();
        session.send(msg);
        session.endDialog();
    }

    /**
     * Extracts text only from messages, removing all entity references
     * @param message builder.IMessage
     */
    private static extractTextFromMessage(message: builder.IMessage): string {
        var s = (message.text) ? message.text : '';
        if (message.entities) {
            message.entities.forEach((ent: any) => {
                s = s.replace(ent.text, '');
            })            
        }
        return s.trim();
    }

    /**
     * Builds a card for the stock
     * @param quote StockQuote
     */
    private static getQuoteCard(symbol:string, session: builder.Session, account:PortfolioAccount) {
        return new Promise((resolve, reject) => {
            StockQuoteController.getQuote(symbol).then((quote:StockQuote) => {
                let btn:builder.CardAction = builder.CardAction.imBack(session, `add ${quote.symbol}`, 'Add to portfolio');
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
                    card.buttons([ btn ]);
                resolve(card.toAttachment());
            }, (err:any) => {
                reject(err);
            });
        });
    }

    /**
     * Formats a stock quote response
     * @param quote StockQuote
     */
    private static formatQuoteCard(quote: StockQuote) : builder.HeroCard {
        var color = (quote.curr_change == 0) ? 'black' : (quote.curr_change > 0) ? 'green' : 'red';
        var symbol = (quote.curr_change == 0) ? 'UNCH' : (quote.curr_change > 0) ? '&#9650;' : '&#9660;';
        return new builder.HeroCard()
                .title(`${quote.symbol} ${quote.current}`)
                .text(`<i><span style='color: ${color};'>${symbol} ${quote.curr_change.toFixed(3)} (${(quote.pct_change * 100).toFixed(3)}%)</span><br/>${quote.name}</i>`);
    }

    private static getHelpMsg() {
        let msg = "The Stocks app for Microsoft Teams allows you to lookup near real-time stock information and build personal and team portfolios. Here are some of the commands you can send me:";
        msg += "<p><b>Command</b>: {symbol}<br/><b>Description</b>: Displays real-time quote for specified stock symbol<br/><b>Example</b>: @Stocks MSFT</p>";
        msg += "<p><b>Command</b>: detail {symbol}<br/><b>Description</b>: Displays detailed real-time quote for specified stock symbol<br/><b>Example</b>: @Stocks detail MSFT</p>";
        msg += "<p><b>Command</b>: add {symbol}<br/><b>Description</b>: Adds the specified stock to portfolio<br/><b>Example</b>: @Stocks add MSFT</p>";
        msg += "<p><b>Command</b>: remove {symbol}<br/><b>Description</b>: Removed the specified stock from portfolio<br/><b>Example</b>: @Stocks remove MSFT</p>";
        msg += "<p><b>Command</b>: list<br/><b>Description</b>: Lists all stocks in the portfolio<br/><b>Example</b>: @Stocks list</p>";
        return msg;
    }
}