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
 * @interface GetAlliancesAllianceIdContacts200Ok
 */
export interface GetAlliancesAllianceIdContacts200Ok {
    /**
     * contact_id integer
     * @type {number}
     * @memberof GetAlliancesAllianceIdContacts200Ok
     */
    contactId: number;
    /**
     * contact_type string
     * @type {string}
     * @memberof GetAlliancesAllianceIdContacts200Ok
     */
    contactType: GetAlliancesAllianceIdContacts200OkContactTypeEnum;
    /**
     * label_ids array
     * @type {Array<number>}
     * @memberof GetAlliancesAllianceIdContacts200Ok
     */
    labelIds?: Array<number>;
    /**
     * Standing of the contact
     * @type {number}
     * @memberof GetAlliancesAllianceIdContacts200Ok
     */
    standing: number;
}


/**
 * @export
 */
export const GetAlliancesAllianceIdContacts200OkContactTypeEnum = {
    Character: 'character',
    Corporation: 'corporation',
    Alliance: 'alliance',
    Faction: 'faction'
} as const;
export type GetAlliancesAllianceIdContacts200OkContactTypeEnum = typeof GetAlliancesAllianceIdContacts200OkContactTypeEnum[keyof typeof GetAlliancesAllianceIdContacts200OkContactTypeEnum];


/**
 * Check if a given object implements the GetAlliancesAllianceIdContacts200Ok interface.
 */
export function instanceOfGetAlliancesAllianceIdContacts200Ok(value: object): value is GetAlliancesAllianceIdContacts200Ok {
    if (!('contactId' in value) || value['contactId'] === undefined) return false;
    if (!('contactType' in value) || value['contactType'] === undefined) return false;
    if (!('standing' in value) || value['standing'] === undefined) return false;
    return true;
}

export function GetAlliancesAllianceIdContacts200OkFromJSON(json: any): GetAlliancesAllianceIdContacts200Ok {
    return GetAlliancesAllianceIdContacts200OkFromJSONTyped(json, false);
}

export function GetAlliancesAllianceIdContacts200OkFromJSONTyped(json: any, ignoreDiscriminator: boolean): GetAlliancesAllianceIdContacts200Ok {
    if (json == null) {
        return json;
    }
    return {
        
        'contactId': json['contact_id'],
        'contactType': json['contact_type'],
        'labelIds': json['label_ids'] == null ? undefined : json['label_ids'],
        'standing': json['standing'],
    };
}

export function GetAlliancesAllianceIdContacts200OkToJSON(json: any): GetAlliancesAllianceIdContacts200Ok {
    return GetAlliancesAllianceIdContacts200OkToJSONTyped(json, false);
}

export function GetAlliancesAllianceIdContacts200OkToJSONTyped(value?: GetAlliancesAllianceIdContacts200Ok | null, ignoreDiscriminator: boolean = false): any {
    if (value == null) {
        return value;
    }

    return {
        
        'contact_id': value['contactId'],
        'contact_type': value['contactType'],
        'label_ids': value['labelIds'],
        'standing': value['standing'],
    };
}
