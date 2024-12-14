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
 * recipient object
 * @export
 * @interface GetCharactersCharacterIdMailRecipient
 */
export interface GetCharactersCharacterIdMailRecipient {
    /**
     * recipient_id integer
     * @type {number}
     * @memberof GetCharactersCharacterIdMailRecipient
     */
    recipientId: number;
    /**
     * recipient_type string
     * @type {string}
     * @memberof GetCharactersCharacterIdMailRecipient
     */
    recipientType: GetCharactersCharacterIdMailRecipientRecipientTypeEnum;
}


/**
 * @export
 */
export const GetCharactersCharacterIdMailRecipientRecipientTypeEnum = {
    Alliance: 'alliance',
    Character: 'character',
    Corporation: 'corporation',
    MailingList: 'mailing_list'
} as const;
export type GetCharactersCharacterIdMailRecipientRecipientTypeEnum = typeof GetCharactersCharacterIdMailRecipientRecipientTypeEnum[keyof typeof GetCharactersCharacterIdMailRecipientRecipientTypeEnum];


/**
 * Check if a given object implements the GetCharactersCharacterIdMailRecipient interface.
 */
export function instanceOfGetCharactersCharacterIdMailRecipient(value: object): value is GetCharactersCharacterIdMailRecipient {
    if (!('recipientId' in value) || value['recipientId'] === undefined) return false;
    if (!('recipientType' in value) || value['recipientType'] === undefined) return false;
    return true;
}

export function GetCharactersCharacterIdMailRecipientFromJSON(json: any): GetCharactersCharacterIdMailRecipient {
    return GetCharactersCharacterIdMailRecipientFromJSONTyped(json, false);
}

export function GetCharactersCharacterIdMailRecipientFromJSONTyped(json: any, ignoreDiscriminator: boolean): GetCharactersCharacterIdMailRecipient {
    if (json == null) {
        return json;
    }
    return {
        
        'recipientId': json['recipient_id'],
        'recipientType': json['recipient_type'],
    };
}

export function GetCharactersCharacterIdMailRecipientToJSON(json: any): GetCharactersCharacterIdMailRecipient {
    return GetCharactersCharacterIdMailRecipientToJSONTyped(json, false);
}

export function GetCharactersCharacterIdMailRecipientToJSONTyped(value?: GetCharactersCharacterIdMailRecipient | null, ignoreDiscriminator: boolean = false): any {
    if (value == null) {
        return value;
    }

    return {
        
        'recipient_id': value['recipientId'],
        'recipient_type': value['recipientType'],
    };
}

