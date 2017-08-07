import {DateStat} from './dateStat';

export class StockQuote {
    constructor() {
        this.stats = new Array<DateStat>();
    }

    symbol:string;
    name:string;
    current:number;
    prev_close:number;
    curr_change:number;
    pct_change:number;
    volume:number;
    stats:Array<DateStat>;
}