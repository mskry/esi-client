/* tslint:disable */
/* eslint-disable */
/**
 * EVE Swagger Interface
 * An OpenAPI for EVE Online
 *
 * The version of the OpenAPI document: 1.30
 * 
 *
 * NOTE: This class is auto generated by OpenAPI Generator (https://openapi-generator.tech).
 * https://openapi-generator.tech
 * Do not edit the class manually.
 */

import { mapValues } from '../runtime';
import type { GetFwLeaderboardsCharactersLastWeekLastWeek } from './GetFwLeaderboardsCharactersLastWeekLastWeek';
import {
    GetFwLeaderboardsCharactersLastWeekLastWeekFromJSON,
    GetFwLeaderboardsCharactersLastWeekLastWeekFromJSONTyped,
    GetFwLeaderboardsCharactersLastWeekLastWeekToJSON,
    GetFwLeaderboardsCharactersLastWeekLastWeekToJSONTyped,
} from './GetFwLeaderboardsCharactersLastWeekLastWeek';
import type { GetFwLeaderboardsCharactersYesterdayYesterday } from './GetFwLeaderboardsCharactersYesterdayYesterday';
import {
    GetFwLeaderboardsCharactersYesterdayYesterdayFromJSON,
    GetFwLeaderboardsCharactersYesterdayYesterdayFromJSONTyped,
    GetFwLeaderboardsCharactersYesterdayYesterdayToJSON,
    GetFwLeaderboardsCharactersYesterdayYesterdayToJSONTyped,
} from './GetFwLeaderboardsCharactersYesterdayYesterday';
import type { GetFwLeaderboardsCharactersActiveTotalActiveTotal } from './GetFwLeaderboardsCharactersActiveTotalActiveTotal';
import {
    GetFwLeaderboardsCharactersActiveTotalActiveTotalFromJSON,
    GetFwLeaderboardsCharactersActiveTotalActiveTotalFromJSONTyped,
    GetFwLeaderboardsCharactersActiveTotalActiveTotalToJSON,
    GetFwLeaderboardsCharactersActiveTotalActiveTotalToJSONTyped,
} from './GetFwLeaderboardsCharactersActiveTotalActiveTotal';

/**
 * Top 100 rankings of pilots by number of kills from yesterday, last week and in total
 * @export
 * @interface GetFwLeaderboardsCharactersKills
 */
export interface GetFwLeaderboardsCharactersKills {
    /**
     * Top 100 ranking of pilots active in faction warfare by total kills. A pilot is considered "active" if they have participated in faction warfare in the past 14 days
     * @type {Array<GetFwLeaderboardsCharactersActiveTotalActiveTotal>}
     * @memberof GetFwLeaderboardsCharactersKills
     */
    activeTotal: Array<GetFwLeaderboardsCharactersActiveTotalActiveTotal>;
    /**
     * Top 100 ranking of pilots by kills in the past week
     * @type {Array<GetFwLeaderboardsCharactersLastWeekLastWeek>}
     * @memberof GetFwLeaderboardsCharactersKills
     */
    lastWeek: Array<GetFwLeaderboardsCharactersLastWeekLastWeek>;
    /**
     * Top 100 ranking of pilots by kills in the past day
     * @type {Array<GetFwLeaderboardsCharactersYesterdayYesterday>}
     * @memberof GetFwLeaderboardsCharactersKills
     */
    yesterday: Array<GetFwLeaderboardsCharactersYesterdayYesterday>;
}

/**
 * Check if a given object implements the GetFwLeaderboardsCharactersKills interface.
 */
export function instanceOfGetFwLeaderboardsCharactersKills(value: object): value is GetFwLeaderboardsCharactersKills {
    if (!('activeTotal' in value) || value['activeTotal'] === undefined) return false;
    if (!('lastWeek' in value) || value['lastWeek'] === undefined) return false;
    if (!('yesterday' in value) || value['yesterday'] === undefined) return false;
    return true;
}

export function GetFwLeaderboardsCharactersKillsFromJSON(json: any): GetFwLeaderboardsCharactersKills {
    return GetFwLeaderboardsCharactersKillsFromJSONTyped(json, false);
}

export function GetFwLeaderboardsCharactersKillsFromJSONTyped(json: any, ignoreDiscriminator: boolean): GetFwLeaderboardsCharactersKills {
    if (json == null) {
        return json;
    }
    return {
        
        'activeTotal': ((json['active_total'] as Array<any>).map(GetFwLeaderboardsCharactersActiveTotalActiveTotalFromJSON)),
        'lastWeek': ((json['last_week'] as Array<any>).map(GetFwLeaderboardsCharactersLastWeekLastWeekFromJSON)),
        'yesterday': ((json['yesterday'] as Array<any>).map(GetFwLeaderboardsCharactersYesterdayYesterdayFromJSON)),
    };
}

export function GetFwLeaderboardsCharactersKillsToJSON(json: any): GetFwLeaderboardsCharactersKills {
    return GetFwLeaderboardsCharactersKillsToJSONTyped(json, false);
}

export function GetFwLeaderboardsCharactersKillsToJSONTyped(value?: GetFwLeaderboardsCharactersKills | null, ignoreDiscriminator: boolean = false): any {
    if (value == null) {
        return value;
    }

    return {
        
        'active_total': ((value['activeTotal'] as Array<any>).map(GetFwLeaderboardsCharactersActiveTotalActiveTotalToJSON)),
        'last_week': ((value['lastWeek'] as Array<any>).map(GetFwLeaderboardsCharactersLastWeekLastWeekToJSON)),
        'yesterday': ((value['yesterday'] as Array<any>).map(GetFwLeaderboardsCharactersYesterdayYesterdayToJSON)),
    };
}

