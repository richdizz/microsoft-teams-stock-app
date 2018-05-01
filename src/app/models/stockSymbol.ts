export class StockSymbol {
    constructor(s:string, n:string) {
        this.symbol = s;
        this.company_name = n;
    }

    symbol:string;
    company_name:string;
}