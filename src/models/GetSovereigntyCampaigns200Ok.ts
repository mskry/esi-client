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
import type { GetSovereigntyCampaignsParticipant } from './GetSovereigntyCampaignsParticipant';
import {
    GetSovereigntyCampaignsParticipantFromJSON,
    GetSovereigntyCampaignsParticipantFromJSONTyped,
    GetSovereigntyCampaignsParticipantToJSON,
    GetSovereigntyCampaignsParticipantToJSONTyped,
} from './GetSovereigntyCampaignsParticipant';

/**
 * 200 ok object
 * @export
 * @interface GetSovereigntyCampaigns200Ok
 */
export interface GetSovereigntyCampaigns200Ok {
    /**
     * Score for all attacking parties, only present in Defense Events.
     * 
     * @type {number}
     * @memberof GetSovereigntyCampaigns200Ok
     */
    attackersScore?: number;
    /**
     * Unique ID for this campaign.
     * @type {number}
     * @memberof GetSovereigntyCampaigns200Ok
     */
    campaignId: number;
    /**
     * The constellation in which the campaign will take place.
     * 
     * @type {number}
     * @memberof GetSovereigntyCampaigns200Ok
     */
    constellationId: number;
    /**
     * Defending alliance, only present in Defense Events
     * 
     * @type {number}
     * @memberof GetSovereigntyCampaigns200Ok
     */
    defenderId?: number;
    /**
     * Score for the defending alliance, only present in Defense Events.
     * 
     * @type {number}
     * @memberof GetSovereigntyCampaigns200Ok
     */
    defenderScore?: number;
    /**
     * Type of event this campaign is for. tcu_defense, ihub_defense and station_defense are referred to as "Defense Events", station_freeport as "Freeport Events".
     * 
     * @type {string}
     * @memberof GetSovereigntyCampaigns200Ok
     */
    eventType: GetSovereigntyCampaigns200OkEventTypeEnum;
    /**
     * Alliance participating and their respective scores, only present in Freeport Events.
     * 
     * @type {Array<GetSovereigntyCampaignsParticipant>}
     * @memberof GetSovereigntyCampaigns200Ok
     */
    participants?: Array<GetSovereigntyCampaignsParticipant>;
    /**
     * The solar system the structure is located in.
     * 
     * @type {number}
     * @memberof GetSovereigntyCampaigns200Ok
     */
    solarSystemId: number;
    /**
     * Time the event is scheduled to start.
     * 
     * @type {Date}
     * @memberof GetSovereigntyCampaigns200Ok
     */
    startTime: Date;
    /**
     * The structure item ID that is related to this campaign.
     * 
     * @type {number}
     * @memberof GetSovereigntyCampaigns200Ok
     */
    structureId: number;
}


/**
 * @export
 */
export const GetSovereigntyCampaigns200OkEventTypeEnum = {
    TcuDefense: 'tcu_defense',
    IhubDefense: 'ihub_defense',
    StationDefense: 'station_defense',
    StationFreeport: 'station_freeport'
} as const;
export type GetSovereigntyCampaigns200OkEventTypeEnum = typeof GetSovereigntyCampaigns200OkEventTypeEnum[keyof typeof GetSovereigntyCampaigns200OkEventTypeEnum];


/**
 * Check if a given object implements the GetSovereigntyCampaigns200Ok interface.
 */
export function instanceOfGetSovereigntyCampaigns200Ok(value: object): value is GetSovereigntyCampaigns200Ok {
    if (!('campaignId' in value) || value['campaignId'] === undefined) return false;
    if (!('constellationId' in value) || value['constellationId'] === undefined) return false;
    if (!('eventType' in value) || value['eventType'] === undefined) return false;
    if (!('solarSystemId' in value) || value['solarSystemId'] === undefined) return false;
    if (!('startTime' in value) || value['startTime'] === undefined) return false;
    if (!('structureId' in value) || value['structureId'] === undefined) return false;
    return true;
}

export function GetSovereigntyCampaigns200OkFromJSON(json: any): GetSovereigntyCampaigns200Ok {
    return GetSovereigntyCampaigns200OkFromJSONTyped(json, false);
}

export function GetSovereigntyCampaigns200OkFromJSONTyped(json: any, ignoreDiscriminator: boolean): GetSovereigntyCampaigns200Ok {
    if (json == null) {
        return json;
    }
    return {
        
        'attackersScore': json['attackers_score'] == null ? undefined : json['attackers_score'],
        'campaignId': json['campaign_id'],
        'constellationId': json['constellation_id'],
        'defenderId': json['defender_id'] == null ? undefined : json['defender_id'],
        'defenderScore': json['defender_score'] == null ? undefined : json['defender_score'],
        'eventType': json['event_type'],
        'participants': json['participants'] == null ? undefined : ((json['participants'] as Array<any>).map(GetSovereigntyCampaignsParticipantFromJSON)),
        'solarSystemId': json['solar_system_id'],
        'startTime': (new Date(json['start_time'])),
        'structureId': json['structure_id'],
    };
}

export function GetSovereigntyCampaigns200OkToJSON(json: any): GetSovereigntyCampaigns200Ok {
    return GetSovereigntyCampaigns200OkToJSONTyped(json, false);
}

export function GetSovereigntyCampaigns200OkToJSONTyped(value?: GetSovereigntyCampaigns200Ok | null, ignoreDiscriminator: boolean = false): any {
    if (value == null) {
        return value;
    }

    return {
        
        'attackers_score': value['attackersScore'],
        'campaign_id': value['campaignId'],
        'constellation_id': value['constellationId'],
        'defender_id': value['defenderId'],
        'defender_score': value['defenderScore'],
        'event_type': value['eventType'],
        'participants': value['participants'] == null ? undefined : ((value['participants'] as Array<any>).map(GetSovereigntyCampaignsParticipantToJSON)),
        'solar_system_id': value['solarSystemId'],
        'start_time': ((value['startTime']).toISOString()),
        'structure_id': value['structureId'],
    };
}

