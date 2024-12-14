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
 * @interface GetCharactersCharacterIdCorporationhistory200Ok
 */
export interface GetCharactersCharacterIdCorporationhistory200Ok {
    /**
     * corporation_id integer
     * @type {number}
     * @memberof GetCharactersCharacterIdCorporationhistory200Ok
     */
    corporationId: number;
    /**
     * True if the corporation has been deleted
     * @type {boolean}
     * @memberof GetCharactersCharacterIdCorporationhistory200Ok
     */
    isDeleted?: boolean;
    /**
     * An incrementing ID that can be used to canonically establish order of records in cases where dates may be ambiguous
     * @type {number}
     * @memberof GetCharactersCharacterIdCorporationhistory200Ok
     */
    recordId: number;
    /**
     * start_date string
     * @type {Date}
     * @memberof GetCharactersCharacterIdCorporationhistory200Ok
     */
    startDate: Date;
}

/**
 * Check if a given object implements the GetCharactersCharacterIdCorporationhistory200Ok interface.
 */
export function instanceOfGetCharactersCharacterIdCorporationhistory200Ok(value: object): value is GetCharactersCharacterIdCorporationhistory200Ok {
    if (!('corporationId' in value) || value['corporationId'] === undefined) return false;
    if (!('recordId' in value) || value['recordId'] === undefined) return false;
    if (!('startDate' in value) || value['startDate'] === undefined) return false;
    return true;
}

export function GetCharactersCharacterIdCorporationhistory200OkFromJSON(json: any): GetCharactersCharacterIdCorporationhistory200Ok {
    return GetCharactersCharacterIdCorporationhistory200OkFromJSONTyped(json, false);
}

export function GetCharactersCharacterIdCorporationhistory200OkFromJSONTyped(json: any, ignoreDiscriminator: boolean): GetCharactersCharacterIdCorporationhistory200Ok {
    if (json == null) {
        return json;
    }
    return {
        
        'corporationId': json['corporation_id'],
        'isDeleted': json['is_deleted'] == null ? undefined : json['is_deleted'],
        'recordId': json['record_id'],
        'startDate': (new Date(json['start_date'])),
    };
}

export function GetCharactersCharacterIdCorporationhistory200OkToJSON(json: any): GetCharactersCharacterIdCorporationhistory200Ok {
    return GetCharactersCharacterIdCorporationhistory200OkToJSONTyped(json, false);
}

export function GetCharactersCharacterIdCorporationhistory200OkToJSONTyped(value?: GetCharactersCharacterIdCorporationhistory200Ok | null, ignoreDiscriminator: boolean = false): any {
    if (value == null) {
        return value;
    }

    return {
        
        'corporation_id': value['corporationId'],
        'is_deleted': value['isDeleted'],
        'record_id': value['recordId'],
        'start_date': ((value['startDate']).toISOString()),
    };
}
