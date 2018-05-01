"use strict";
// Copyright (c) Wictor Wilén. All rights reserved. 
// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
Object.defineProperty(exports, "__esModule", { value: true });
const theme_1 = require("./theme");
/**
 * Implementation of Portfolio remove page
 */
class portfolioRemove {
    constructor() {
        microsoftTeams.initialize();
        microsoftTeams.getContext((context) => {
            theme_1.TeamsTheme.fix(context);
            microsoftTeams.settings.setValidityState(true);
        });
        microsoftTeams.settings.registerOnRemoveHandler((removeEvent) => {
            removeEvent.notifySuccess();
        });
    }
}
exports.portfolioRemove = portfolioRemove;
//# sourceMappingURL=portfolioRemove.js.map