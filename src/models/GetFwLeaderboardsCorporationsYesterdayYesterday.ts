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
 * yesterday object
 * @export
 * @interface GetFwLeaderboardsCorporationsYesterdayYesterday
 */
export interface GetFwLeaderboardsCorporationsYesterdayYesterday {
    /**
     * Amount of kills
     * @type {number}
     * @memberof GetFwLeaderboardsCorporationsYesterdayYesterday
     */
    amount?: number;
    /**
     * corporation_id integer
     * @type {number}
     * @memberof GetFwLeaderboardsCorporationsYesterdayYesterday
     */
    corporationId?: number;
}

/**
 * Check if a given object implements the GetFwLeaderboardsCorporationsYesterdayYesterday interface.
 */
export function instanceOfGetFwLeaderboardsCorporationsYesterdayYesterday(value: object): value is GetFwLeaderboardsCorporationsYesterdayYesterday {
    return true;
}

export function GetFwLeaderboardsCorporationsYesterdayYesterdayFromJSON(json: any): GetFwLeaderboardsCorporationsYesterdayYesterday {
    return GetFwLeaderboardsCorporationsYesterdayYesterdayFromJSONTyped(json, false);
}

export function GetFwLeaderboardsCorporationsYesterdayYesterdayFromJSONTyped(json: any, ignoreDiscriminator: boolean): GetFwLeaderboardsCorporationsYesterdayYesterday {
    if (json == null) {
        return json;
    }
    return {
        
        'amount': json['amount'] == null ? undefined : json['amount'],
        'corporationId': json['corporation_id'] == null ? undefined : json['corporation_id'],
    };
}

export function GetFwLeaderboardsCorporationsYesterdayYesterdayToJSON(json: any): GetFwLeaderboardsCorporationsYesterdayYesterday {
    return GetFwLeaderboardsCorporationsYesterdayYesterdayToJSONTyped(json, false);
}

export function GetFwLeaderboardsCorporationsYesterdayYesterdayToJSONTyped(value?: GetFwLeaderboardsCorporationsYesterdayYesterday | null, ignoreDiscriminator: boolean = false): any {
    if (value == null) {
        return value;
    }

    return {
        
        'amount': value['amount'],
        'corporation_id': value['corporationId'],
    };
}
