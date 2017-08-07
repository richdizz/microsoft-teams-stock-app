"use strict";
// Copyright (c) Wictor Wilén. All rights reserved. 
// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
Object.defineProperty(exports, "__esModule", { value: true });
const theme_1 = require("./theme");
/**
 * Implementation of Portfolio configuration page
 */
class portfolioConfig {
    constructor() {
        microsoftTeams.initialize();
        microsoftTeams.getContext((context) => {
            theme_1.TeamsTheme.fix(context);
            microsoftTeams.settings.setValidityState(true);
        });
        microsoftTeams.settings.registerOnSaveHandler((saveEvent) => {
            // Calculate host dynamically to enable local debugging
            let host = "https://" + window.location.host;
            let defaultTabName = `Stocks`;
            // Upper case first letter of tab name
            defaultTabName = defaultTabName.charAt(0).toUpperCase() + defaultTabName.slice(1);
            microsoftTeams.settings.setSettings({
                contentUrl: host + "/portfolioTab.html",
                suggestedDisplayName: defaultTabName,
                removeUrl: host + "/portfolioRemove.html",
                entityId: "stocks"
            });
            saveEvent.notifySuccess();
        });
    }
}
exports.portfolioConfig = portfolioConfig;
//# sourceMappingURL=portfolioConfig.js.map