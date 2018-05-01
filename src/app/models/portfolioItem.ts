export class PortfolioItem {
    constructor(symbol?:string, user?:any, date?:Date) {
        if (symbol)
            this.symbol = symbol;
        if (date)
            this.added_date = date;
        if (user) {
            this.added_by_id = <string>user.id;
            this.added_by_name = <string>user.name;
        }
    }

    symbol:string;
    added_date:Date;
    added_by_id:string;
    added_by_name:string;
}