// Copyright (c) Wictor Wilén. All rights reserved. 
// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import {TeamsTheme} from './theme';

/**
 * Implementation of Portfolio configuration page
 */
export class portfolioConfig {
    constructor() {
        microsoftTeams.initialize();

        microsoftTeams.getContext((context:microsoftTeams.Context) => {
            TeamsTheme.fix(context);
            microsoftTeams.settings.setValidityState(true);
        });
		
        microsoftTeams.settings.registerOnSaveHandler((saveEvent: microsoftTeams.settings.SaveEvent) => {
			// Calculate host dynamically to enable local debugging
			let host = "https://" + window.location.host;
            let defaultTabName: string = `Stocks`;
            
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