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
 * @interface GetCorporationsCorporationIdContacts200Ok
 */
export interface GetCorporationsCorporationIdContacts200Ok {
    /**
     * contact_id integer
     * @type {number}
     * @memberof GetCorporationsCorporationIdContacts200Ok
     */
    contactId: number;
    /**
     * contact_type string
     * @type {string}
     * @memberof GetCorporationsCorporationIdContacts200Ok
     */
    contactType: GetCorporationsCorporationIdContacts200OkContactTypeEnum;
    /**
     * Whether this contact is being watched
     * @type {boolean}
     * @memberof GetCorporationsCorporationIdContacts200Ok
     */
    isWatched?: boolean;
    /**
     * label_ids array
     * @type {Array<number>}
     * @memberof GetCorporationsCorporationIdContacts200Ok
     */
    labelIds?: Array<number>;
    /**
     * Standing of the contact
     * @type {number}
     * @memberof GetCorporationsCorporationIdContacts200Ok
     */
    standing: number;
}


/**
 * @export
 */
export const GetCorporationsCorporationIdContacts200OkContactTypeEnum = {
    Character: 'character',
    Corporation: 'corporation',
    Alliance: 'alliance',
    Faction: 'faction'
} as const;
export type GetCorporationsCorporationIdContacts200OkContactTypeEnum = typeof GetCorporationsCorporationIdContacts200OkContactTypeEnum[keyof typeof GetCorporationsCorporationIdContacts200OkContactTypeEnum];


/**
 * Check if a given object implements the GetCorporationsCorporationIdContacts200Ok interface.
 */
export function instanceOfGetCorporationsCorporationIdContacts200Ok(value: object): value is GetCorporationsCorporationIdContacts200Ok {
    if (!('contactId' in value) || value['contactId'] === undefined) return false;
    if (!('contactType' in value) || value['contactType'] === undefined) return false;
    if (!('standing' in value) || value['standing'] === undefined) return false;
    return true;
}

export function GetCorporationsCorporationIdContacts200OkFromJSON(json: any): GetCorporationsCorporationIdContacts200Ok {
    return GetCorporationsCorporationIdContacts200OkFromJSONTyped(json, false);
}

export function GetCorporationsCorporationIdContacts200OkFromJSONTyped(json: any, ignoreDiscriminator: boolean): GetCorporationsCorporationIdContacts200Ok {
    if (json == null) {
        return json;
    }
    return {
        
        'contactId': json['contact_id'],
        'contactType': json['contact_type'],
        'isWatched': json['is_watched'] == null ? undefined : json['is_watched'],
        'labelIds': json['label_ids'] == null ? undefined : json['label_ids'],
        'standing': json['standing'],
    };
}

export function GetCorporationsCorporationIdContacts200OkToJSON(json: any): GetCorporationsCorporationIdContacts200Ok {
    return GetCorporationsCorporationIdContacts200OkToJSONTyped(json, false);
}

export function GetCorporationsCorporationIdContacts200OkToJSONTyped(value?: GetCorporationsCorporationIdContacts200Ok | null, ignoreDiscriminator: boolean = false): any {
    if (value == null) {
        return value;
    }

    return {
        
        'contact_id': value['contactId'],
        'contact_type': value['contactType'],
        'is_watched': value['isWatched'],
        'label_ids': value['labelIds'],
        'standing': value['standing'],
    };
}

