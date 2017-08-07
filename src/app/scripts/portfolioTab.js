"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const theme_1 = require("./theme");
const angular = require("angular");
/**
 * Implementation of the Portfolio content page
 */
class portfolioTab {
    /**
     * Constructor for portfolioTab that initializes the Microsoft Teams script and themes management
     */
    constructor() {
        microsoftTeams.initialize();
        theme_1.TeamsTheme.fix();
        let angularModule = angular.module('stocks', [])
            .controller('stocksCtrl', ['$scope', '$http', ($scope, $http) => {
                // start by getting the context for the user
                microsoftTeams.getContext((context) => {
                    let id = '';
                    $scope.deeplinktext = context.subEntityId;
                    if (context.channelId) {
                        // this is a team channel
                        id = context.channelId;
                    }
                    else {
                        // this is static tab for individual
                        id = context.upn;
                    }
                    // perform the get for account information
                    let host = "https://" + window.location.host;
                    $http.get(`${host}/api/account?id=${id}`)
                        .then((result) => {
                        $scope.data = result.data;
                        angular.forEach(result.data.stocks, (val, key) => {
                            val.loaded = false;
                            $http.get(`${host}/api/quote/${val.symbol}`).then((quote) => {
                                $scope.updateStock(quote);
                            }, function (err) {
                                //TODO
                                console.log(err);
                            });
                        });
                    }, function (err) {
                        //TODO
                        console.log(err);
                    });
                });
                $scope.updateStock = (quote) => {
                    for (var i = 0; i < $scope.data.stocks.length; i++) {
                        if ($scope.data.stocks[i].symbol == quote.data.symbol) {
                            $scope.data.stocks[i].current = quote.data.current;
                            $scope.data.stocks[i].prev_close = quote.data.prev_close;
                            $scope.data.stocks[i].curr_change = quote.data.curr_change;
                            $scope.data.stocks[i].pct_change = quote.data.pct_change;
                            $scope.data.stocks[i].loaded = true;
                            $scope.$apply();
                            break;
                        }
                    }
                };
                // generates a deep link for the stock
                $scope.deeplink = (symbol) => {
                    microsoftTeams.shareDeepLink({ subEntityId: symbol, subEntityLabel: symbol, subEntityWebUrl: `https://www.cnbc.com/quotes/?symbol=${symbol}` });
                };
            }]);
        angular.bootstrap(document, ['stocks']);
    }
}
exports.portfolioTab = portfolioTab;
//# sourceMappingURL=portfolioTab.js.map