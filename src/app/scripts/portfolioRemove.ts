// Copyright (c) Wictor Wilén. All rights reserved. 
// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import {TeamsTheme} from './theme';

/**
 * Implementation of Portfolio remove page
 */
export class portfolioRemove {
    constructor() {
        microsoftTeams.initialize();

        microsoftTeams.getContext((context:microsoftTeams.Context) => {
            TeamsTheme.fix(context);
            microsoftTeams.settings.setValidityState(true);
        });
		
        microsoftTeams.settings.registerOnRemoveHandler((removeEvent: microsoftTeams.settings.RemoveEvent) => {
            removeEvent.notifySuccess();
        });
    }
}