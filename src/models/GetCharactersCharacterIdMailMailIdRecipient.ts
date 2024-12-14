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
 * @interface GetCharactersCharacterIdMailMailIdRecipient
 */
export interface GetCharactersCharacterIdMailMailIdRecipient {
    /**
     * recipient_id integer
     * @type {number}
     * @memberof GetCharactersCharacterIdMailMailIdRecipient
     */
    recipientId: number;
    /**
     * recipient_type string
     * @type {string}
     * @memberof GetCharactersCharacterIdMailMailIdRecipient
     */
    recipientType: GetCharactersCharacterIdMailMailIdRecipientRecipientTypeEnum;
}


/**
 * @export
 */
export const GetCharactersCharacterIdMailMailIdRecipientRecipientTypeEnum = {
    Alliance: 'alliance',
    Character: 'character',
    Corporation: 'corporation',
    MailingList: 'mailing_list'
} as const;
export type GetCharactersCharacterIdMailMailIdRecipientRecipientTypeEnum = typeof GetCharactersCharacterIdMailMailIdRecipientRecipientTypeEnum[keyof typeof GetCharactersCharacterIdMailMailIdRecipientRecipientTypeEnum];


/**
 * Check if a given object implements the GetCharactersCharacterIdMailMailIdRecipient interface.
 */
export function instanceOfGetCharactersCharacterIdMailMailIdRecipient(value: object): value is GetCharactersCharacterIdMailMailIdRecipient {
    if (!('recipientId' in value) || value['recipientId'] === undefined) return false;
    if (!('recipientType' in value) || value['recipientType'] === undefined) return false;
    return true;
}

export function GetCharactersCharacterIdMailMailIdRecipientFromJSON(json: any): GetCharactersCharacterIdMailMailIdRecipient {
    return GetCharactersCharacterIdMailMailIdRecipientFromJSONTyped(json, false);
}

export function GetCharactersCharacterIdMailMailIdRecipientFromJSONTyped(json: any, ignoreDiscriminator: boolean): GetCharactersCharacterIdMailMailIdRecipient {
    if (json == null) {
        return json;
    }
    return {
        
        'recipientId': json['recipient_id'],
        'recipientType': json['recipient_type'],
    };
}

export function GetCharactersCharacterIdMailMailIdRecipientToJSON(json: any): GetCharactersCharacterIdMailMailIdRecipient {
    return GetCharactersCharacterIdMailMailIdRecipientToJSONTyped(json, false);
}

export function GetCharactersCharacterIdMailMailIdRecipientToJSONTyped(value?: GetCharactersCharacterIdMailMailIdRecipient | null, ignoreDiscriminator: boolean = false): any {
    if (value == null) {
        return value;
    }

    return {
        
        'recipient_id': value['recipientId'],
        'recipient_type': value['recipientType'],
    };
}
