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
 * participant object
 * @export
 * @interface GetSovereigntyCampaignsParticipant
 */
export interface GetSovereigntyCampaignsParticipant {
    /**
     * alliance_id integer
     * @type {number}
     * @memberof GetSovereigntyCampaignsParticipant
     */
    allianceId: number;
    /**
     * score number
     * @type {number}
     * @memberof GetSovereigntyCampaignsParticipant
     */
    score: number;
}

/**
 * Check if a given object implements the GetSovereigntyCampaignsParticipant interface.
 */
export function instanceOfGetSovereigntyCampaignsParticipant(value: object): value is GetSovereigntyCampaignsParticipant {
    if (!('allianceId' in value) || value['allianceId'] === undefined) return false;
    if (!('score' in value) || value['score'] === undefined) return false;
    return true;
}

export function GetSovereigntyCampaignsParticipantFromJSON(json: any): GetSovereigntyCampaignsParticipant {
    return GetSovereigntyCampaignsParticipantFromJSONTyped(json, false);
}

export function GetSovereigntyCampaignsParticipantFromJSONTyped(json: any, ignoreDiscriminator: boolean): GetSovereigntyCampaignsParticipant {
    if (json == null) {
        return json;
    }
    return {
        
        'allianceId': json['alliance_id'],
        'score': json['score'],
    };
}

export function GetSovereigntyCampaignsParticipantToJSON(json: any): GetSovereigntyCampaignsParticipant {
    return GetSovereigntyCampaignsParticipantToJSONTyped(json, false);
}

export function GetSovereigntyCampaignsParticipantToJSONTyped(value?: GetSovereigntyCampaignsParticipant | null, ignoreDiscriminator: boolean = false): any {
    if (value == null) {
        return value;
    }

    return {
        
        'alliance_id': value['allianceId'],
        'score': value['score'],
    };
}

