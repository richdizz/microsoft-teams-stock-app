import { TeamsTheme } from './theme';
import * as angular from 'angular';
import * as chartist from 'chartist';

/**
 * Implementation of the Portfolio content page
 */
export class portfolioTab {
    /**
     * Constructor for portfolioTab that initializes the Microsoft Teams script and themes management
     */
    constructor() {
        microsoftTeams.initialize();
        TeamsTheme.fix();

        let angularModule = angular.module('stocks', ['angular-chartist'])
        .controller('stocksCtrl', ['$scope', '$http', ($scope, $http) => {
            // start by getting the context for the user
            microsoftTeams.getContext((context: microsoftTeams.Context) => {
                $scope.wait = true;
                $scope.id = '';
                if (context.subEntityId) {
                    $scope.showdetail(context.subEntityId);
                }
                if (context.channelId) {
                    // this is a team channel
                    $scope.id = context.channelId;
                }
                else {
                    // this is static tab for individual
                    $scope.id = <string>context.upn;
                }

                // perform the get for account information
                let host = "https://" + window.location.host
                $http.get(`${host}/api/account?id=${$scope.id}`)
                    .then((result:any) => {
                        $scope.wait = false;
                        $scope.data = result.data;
                        angular.forEach(result.data.stocks, (val:any, key:any) => {
                            val.loaded = false;
                            $http.get(`${host}/api/quote/${val.symbol}`).then((quote:any) => {
                                $scope.updateStock(quote);
                            }, function(err:any) {
                                //TODO
                                console.log(err);
                            });
                        });
                    }, function(err:any) {
                        //TODO
                        $scope.wait = false;
                        console.log(err);
                    });
            });

            $scope.chartoptions = {
                fullWidth: true,
                showArea: true,
                showPoint: false,
                lineSmooth: chartist.Interpolation.cardinal({
                    tension: 0
                }),
                axisX: {
                    labelInterpolationFnc: (value:any, index:any) => {
                    return index % 5  === 0 ? value : null;
                    }
                }
            };

            $scope.updateStock = (quote:any) => {
                for (var i = 0; i < $scope.data.stocks.length; i++) {
                    if ($scope.data.stocks[i].symbol == quote.data.symbol) {
                        $scope.data.stocks[i].current = quote.data.current;
                        $scope.data.stocks[i].prev_close = quote.data.prev_close;
                        $scope.data.stocks[i].curr_change = quote.data.curr_change;
                        $scope.data.stocks[i].pct_change = quote.data.pct_change;
                        $scope.data.stocks[i].loaded = true;
                        //$scope.$apply();
                        break;
                    }
                }
            };

            // generates a deep link for the stock
            $scope.deeplink = (symbol:string) => {
                microsoftTeams.shareDeepLink({ subEntityId: symbol, subEntityLabel: symbol, subEntityWebUrl: `https://www.cnbc.com/quotes/?symbol=${symbol}`});
            };

            // show detail
            $scope.showdetail = (symbol:string) => {
                $scope.wait = true;
                let host = "https://" + window.location.host
                $http.get(`${host}/api/quote/${symbol}?showdetail=true`).then((quote:any) => {
                    $scope.detail = quote.data;
                    
                    // initialize chartdata
                    $scope.chartdata = {
                        labels: [],
                        series: [
                            []
                        ]
                    };
                    
                    // add data backwards
                    for (var i = quote.data.stats.length - 1; i >= 0 ; i--) {
                        $scope.chartdata.labels.push(quote.data.stats[i].date);
                        $scope.chartdata.series[0].push(quote.data.stats[i].close);
                    }

                    $scope.wait = false;
                    $scope.showdlg = true;
                }, function(err:any) {
                    //TODO
                    console.log(err);
                });
            };

            // close dialog
            $scope.showdlg = false;
            $scope.closeDialog = () => {
                $scope.showdlg = false;
            };

            //delete stock
            $scope.deletestock = (symbol:string) => {
                $scope.wait = true;
                let host = "https://" + window.location.host
                $http.delete(`${host}/api/account/${$scope.id}/${symbol}`)
                    .then((result:any) => {
                        // remove the item from the collection
                        for (var i = 0; i < $scope.data.stocks.length; i++) {
                            if ($scope.data.stocks[i].symbol == symbol) {
                                $scope.data.stocks.splice(i, 1);
                                $scope.wait = false;
                                $scope.$apply();
                                break;
                            }
                        }
                    }, function(err:any) {
                        //TODO
                        console.log(err);
                    });
            };

            //refresh stock
            $scope.refresh = (symbol:string) => {
                let host = "https://" + window.location.host
                $http.get(`${host}/api/quote/${symbol}`).then((quote:any) => {
                    $scope.updateStock(quote);
                }, function(err:any) {
                    //TODO
                    console.log(err);
                });
            };
        }]);
        angular.bootstrap(document, ['stocks']);
    }
}