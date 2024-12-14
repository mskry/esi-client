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
 * @interface GetCharactersCharacterIdOnlineOk
 */
export interface GetCharactersCharacterIdOnlineOk {
    /**
     * Timestamp of the last login
     * @type {Date}
     * @memberof GetCharactersCharacterIdOnlineOk
     */
    lastLogin?: Date;
    /**
     * Timestamp of the last logout
     * @type {Date}
     * @memberof GetCharactersCharacterIdOnlineOk
     */
    lastLogout?: Date;
    /**
     * Total number of times the character has logged in
     * @type {number}
     * @memberof GetCharactersCharacterIdOnlineOk
     */
    logins?: number;
    /**
     * If the character is online
     * @type {boolean}
     * @memberof GetCharactersCharacterIdOnlineOk
     */
    online: boolean;
}

/**
 * Check if a given object implements the GetCharactersCharacterIdOnlineOk interface.
 */
export function instanceOfGetCharactersCharacterIdOnlineOk(value: object): value is GetCharactersCharacterIdOnlineOk {
    if (!('online' in value) || value['online'] === undefined) return false;
    return true;
}

export function GetCharactersCharacterIdOnlineOkFromJSON(json: any): GetCharactersCharacterIdOnlineOk {
    return GetCharactersCharacterIdOnlineOkFromJSONTyped(json, false);
}

export function GetCharactersCharacterIdOnlineOkFromJSONTyped(json: any, ignoreDiscriminator: boolean): GetCharactersCharacterIdOnlineOk {
    if (json == null) {
        return json;
    }
    return {
        
        'lastLogin': json['last_login'] == null ? undefined : (new Date(json['last_login'])),
        'lastLogout': json['last_logout'] == null ? undefined : (new Date(json['last_logout'])),
        'logins': json['logins'] == null ? undefined : json['logins'],
        'online': json['online'],
    };
}

export function GetCharactersCharacterIdOnlineOkToJSON(json: any): GetCharactersCharacterIdOnlineOk {
    return GetCharactersCharacterIdOnlineOkToJSONTyped(json, false);
}

export function GetCharactersCharacterIdOnlineOkToJSONTyped(value?: GetCharactersCharacterIdOnlineOk | null, ignoreDiscriminator: boolean = false): any {
    if (value == null) {
        return value;
    }

    return {
        
        'last_login': value['lastLogin'] == null ? undefined : ((value['lastLogin']).toISOString()),
        'last_logout': value['lastLogout'] == null ? undefined : ((value['lastLogout']).toISOString()),
        'logins': value['logins'],
        'online': value['online'],
    };
}
