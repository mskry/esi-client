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
 * Summary of victory points gained by the given character for the enlisted faction
 * @export
 * @interface GetCharactersCharacterIdFwStatsVictoryPoints
 */
export interface GetCharactersCharacterIdFwStatsVictoryPoints {
    /**
     * Last week's victory points gained by the given character
     * @type {number}
     * @memberof GetCharactersCharacterIdFwStatsVictoryPoints
     */
    lastWeek: number;
    /**
     * Total victory points gained since the given character enlisted
     * @type {number}
     * @memberof GetCharactersCharacterIdFwStatsVictoryPoints
     */
    total: number;
    /**
     * Yesterday's victory points gained by the given character
     * @type {number}
     * @memberof GetCharactersCharacterIdFwStatsVictoryPoints
     */
    yesterday: number;
}

/**
 * Check if a given object implements the GetCharactersCharacterIdFwStatsVictoryPoints interface.
 */
export function instanceOfGetCharactersCharacterIdFwStatsVictoryPoints(value: object): value is GetCharactersCharacterIdFwStatsVictoryPoints {
    if (!('lastWeek' in value) || value['lastWeek'] === undefined) return false;
    if (!('total' in value) || value['total'] === undefined) return false;
    if (!('yesterday' in value) || value['yesterday'] === undefined) return false;
    return true;
}

export function GetCharactersCharacterIdFwStatsVictoryPointsFromJSON(json: any): GetCharactersCharacterIdFwStatsVictoryPoints {
    return GetCharactersCharacterIdFwStatsVictoryPointsFromJSONTyped(json, false);
}

export function GetCharactersCharacterIdFwStatsVictoryPointsFromJSONTyped(json: any, ignoreDiscriminator: boolean): GetCharactersCharacterIdFwStatsVictoryPoints {
    if (json == null) {
        return json;
    }
    return {
        
        'lastWeek': json['last_week'],
        'total': json['total'],
        'yesterday': json['yesterday'],
    };
}

export function GetCharactersCharacterIdFwStatsVictoryPointsToJSON(json: any): GetCharactersCharacterIdFwStatsVictoryPoints {
    return GetCharactersCharacterIdFwStatsVictoryPointsToJSONTyped(json, false);
}

export function GetCharactersCharacterIdFwStatsVictoryPointsToJSONTyped(value?: GetCharactersCharacterIdFwStatsVictoryPoints | null, ignoreDiscriminator: boolean = false): any {
    if (value == null) {
        return value;
    }

    return {
        
        'last_week': value['lastWeek'],
        'total': value['total'],
        'yesterday': value['yesterday'],
    };
}
