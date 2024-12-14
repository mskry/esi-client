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
 * Optional object that is returned if a bookmark was made on a particular item.
 * @export
 * @interface GetCharactersCharacterIdBookmarksItem
 */
export interface GetCharactersCharacterIdBookmarksItem {
    /**
     * item_id integer
     * @type {number}
     * @memberof GetCharactersCharacterIdBookmarksItem
     */
    itemId: number;
    /**
     * type_id integer
     * @type {number}
     * @memberof GetCharactersCharacterIdBookmarksItem
     */
    typeId: number;
}

/**
 * Check if a given object implements the GetCharactersCharacterIdBookmarksItem interface.
 */
export function instanceOfGetCharactersCharacterIdBookmarksItem(value: object): value is GetCharactersCharacterIdBookmarksItem {
    if (!('itemId' in value) || value['itemId'] === undefined) return false;
    if (!('typeId' in value) || value['typeId'] === undefined) return false;
    return true;
}

export function GetCharactersCharacterIdBookmarksItemFromJSON(json: any): GetCharactersCharacterIdBookmarksItem {
    return GetCharactersCharacterIdBookmarksItemFromJSONTyped(json, false);
}

export function GetCharactersCharacterIdBookmarksItemFromJSONTyped(json: any, ignoreDiscriminator: boolean): GetCharactersCharacterIdBookmarksItem {
    if (json == null) {
        return json;
    }
    return {
        
        'itemId': json['item_id'],
        'typeId': json['type_id'],
    };
}

export function GetCharactersCharacterIdBookmarksItemToJSON(json: any): GetCharactersCharacterIdBookmarksItem {
    return GetCharactersCharacterIdBookmarksItemToJSONTyped(json, false);
}

export function GetCharactersCharacterIdBookmarksItemToJSONTyped(value?: GetCharactersCharacterIdBookmarksItem | null, ignoreDiscriminator: boolean = false): any {
    if (value == null) {
        return value;
    }

    return {
        
        'item_id': value['itemId'],
        'type_id': value['typeId'],
    };
}
