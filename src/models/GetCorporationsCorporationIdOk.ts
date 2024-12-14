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
 * 200 ok object
 * @export
 * @interface GetCorporationsCorporationIdOk
 */
export interface GetCorporationsCorporationIdOk {
    /**
     * ID of the alliance that corporation is a member of, if any
     * @type {number}
     * @memberof GetCorporationsCorporationIdOk
     */
    allianceId?: number;
    /**
     * ceo_id integer
     * @type {number}
     * @memberof GetCorporationsCorporationIdOk
     */
    ceoId: number;
    /**
     * creator_id integer
     * @type {number}
     * @memberof GetCorporationsCorporationIdOk
     */
    creatorId: number;
    /**
     * date_founded string
     * @type {Date}
     * @memberof GetCorporationsCorporationIdOk
     */
    dateFounded?: Date;
    /**
     * description string
     * @type {string}
     * @memberof GetCorporationsCorporationIdOk
     */
    description?: string;
    /**
     * faction_id integer
     * @type {number}
     * @memberof GetCorporationsCorporationIdOk
     */
    factionId?: number;
    /**
     * home_station_id integer
     * @type {number}
     * @memberof GetCorporationsCorporationIdOk
     */
    homeStationId?: number;
    /**
     * member_count integer
     * @type {number}
     * @memberof GetCorporationsCorporationIdOk
     */
    memberCount: number;
    /**
     * the full name of the corporation
     * @type {string}
     * @memberof GetCorporationsCorporationIdOk
     */
    name: string;
    /**
     * shares integer
     * @type {number}
     * @memberof GetCorporationsCorporationIdOk
     */
    shares?: number;
    /**
     * tax_rate number
     * @type {number}
     * @memberof GetCorporationsCorporationIdOk
     */
    taxRate: number;
    /**
     * the short name of the corporation
     * @type {string}
     * @memberof GetCorporationsCorporationIdOk
     */
    ticker: string;
    /**
     * url string
     * @type {string}
     * @memberof GetCorporationsCorporationIdOk
     */
    url?: string;
    /**
     * war_eligible boolean
     * @type {boolean}
     * @memberof GetCorporationsCorporationIdOk
     */
    warEligible?: boolean;
}

/**
 * Check if a given object implements the GetCorporationsCorporationIdOk interface.
 */
export function instanceOfGetCorporationsCorporationIdOk(value: object): value is GetCorporationsCorporationIdOk {
    if (!('ceoId' in value) || value['ceoId'] === undefined) return false;
    if (!('creatorId' in value) || value['creatorId'] === undefined) return false;
    if (!('memberCount' in value) || value['memberCount'] === undefined) return false;
    if (!('name' in value) || value['name'] === undefined) return false;
    if (!('taxRate' in value) || value['taxRate'] === undefined) return false;
    if (!('ticker' in value) || value['ticker'] === undefined) return false;
    return true;
}

export function GetCorporationsCorporationIdOkFromJSON(json: any): GetCorporationsCorporationIdOk {
    return GetCorporationsCorporationIdOkFromJSONTyped(json, false);
}

export function GetCorporationsCorporationIdOkFromJSONTyped(json: any, ignoreDiscriminator: boolean): GetCorporationsCorporationIdOk {
    if (json == null) {
        return json;
    }
    return {
        
        'allianceId': json['alliance_id'] == null ? undefined : json['alliance_id'],
        'ceoId': json['ceo_id'],
        'creatorId': json['creator_id'],
        'dateFounded': json['date_founded'] == null ? undefined : (new Date(json['date_founded'])),
        'description': json['description'] == null ? undefined : json['description'],
        'factionId': json['faction_id'] == null ? undefined : json['faction_id'],
        'homeStationId': json['home_station_id'] == null ? undefined : json['home_station_id'],
        'memberCount': json['member_count'],
        'name': json['name'],
        'shares': json['shares'] == null ? undefined : json['shares'],
        'taxRate': json['tax_rate'],
        'ticker': json['ticker'],
        'url': json['url'] == null ? undefined : json['url'],
        'warEligible': json['war_eligible'] == null ? undefined : json['war_eligible'],
    };
}

export function GetCorporationsCorporationIdOkToJSON(json: any): GetCorporationsCorporationIdOk {
    return GetCorporationsCorporationIdOkToJSONTyped(json, false);
}

export function GetCorporationsCorporationIdOkToJSONTyped(value?: GetCorporationsCorporationIdOk | null, ignoreDiscriminator: boolean = false): any {
    if (value == null) {
        return value;
    }

    return {
        
        'alliance_id': value['allianceId'],
        'ceo_id': value['ceoId'],
        'creator_id': value['creatorId'],
        'date_founded': value['dateFounded'] == null ? undefined : ((value['dateFounded']).toISOString()),
        'description': value['description'],
        'faction_id': value['factionId'],
        'home_station_id': value['homeStationId'],
        'member_count': value['memberCount'],
        'name': value['name'],
        'shares': value['shares'],
        'tax_rate': value['taxRate'],
        'ticker': value['ticker'],
        'url': value['url'],
        'war_eligible': value['warEligible'],
    };
}

