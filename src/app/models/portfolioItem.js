"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class PortfolioItem {
    constructor(symbol, user, date) {
        if (symbol)
            this.symbol = symbol;
        if (date)
            this.added_date = date;
        if (user) {
            this.added_by_id = user.id;
            this.added_by_name = user.name;
        }
    }
}
exports.PortfolioItem = PortfolioItem;
//# sourceMappingURL=portfolioItem.js.map