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
/**
 * last_week object
 * @export
 * @interface GetFwLeaderboardsLastWeekLastWeek
 */
export interface GetFwLeaderboardsLastWeekLastWeek {
    /**
     * Amount of kills
     * @type {number}
     * @memberof GetFwLeaderboardsLastWeekLastWeek
     */
    amount?: number;
    /**
     * faction_id integer
     * @type {number}
     * @memberof GetFwLeaderboardsLastWeekLastWeek
     */
    factionId?: number;
}

/**
 * Check if a given object implements the GetFwLeaderboardsLastWeekLastWeek interface.
 */
export function instanceOfGetFwLeaderboardsLastWeekLastWeek(value: object): value is GetFwLeaderboardsLastWeekLastWeek {
    return true;
}

export function GetFwLeaderboardsLastWeekLastWeekFromJSON(json: any): GetFwLeaderboardsLastWeekLastWeek {
    return GetFwLeaderboardsLastWeekLastWeekFromJSONTyped(json, false);
}

export function GetFwLeaderboardsLastWeekLastWeekFromJSONTyped(json: any, ignoreDiscriminator: boolean): GetFwLeaderboardsLastWeekLastWeek {
    if (json == null) {
        return json;
    }
    return {
        
        'amount': json['amount'] == null ? undefined : json['amount'],
        'factionId': json['faction_id'] == null ? undefined : json['faction_id'],
    };
}

export function GetFwLeaderboardsLastWeekLastWeekToJSON(json: any): GetFwLeaderboardsLastWeekLastWeek {
    return GetFwLeaderboardsLastWeekLastWeekToJSONTyped(json, false);
}

export function GetFwLeaderboardsLastWeekLastWeekToJSONTyped(value?: GetFwLeaderboardsLastWeekLastWeek | null, ignoreDiscriminator: boolean = false): any {
    if (value == null) {
        return value;
    }

    return {
        
        'amount': value['amount'],
        'faction_id': value['factionId'],
    };
}
