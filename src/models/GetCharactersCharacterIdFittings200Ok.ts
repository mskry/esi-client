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
import type { GetCharactersCharacterIdFittingsItem } from './GetCharactersCharacterIdFittingsItem';
import {
    GetCharactersCharacterIdFittingsItemFromJSON,
    GetCharactersCharacterIdFittingsItemFromJSONTyped,
    GetCharactersCharacterIdFittingsItemToJSON,
    GetCharactersCharacterIdFittingsItemToJSONTyped,
} from './GetCharactersCharacterIdFittingsItem';

/**
 * 200 ok object
 * @export
 * @interface GetCharactersCharacterIdFittings200Ok
 */
export interface GetCharactersCharacterIdFittings200Ok {
    /**
     * description string
     * @type {string}
     * @memberof GetCharactersCharacterIdFittings200Ok
     */
    description: string;
    /**
     * fitting_id integer
     * @type {number}
     * @memberof GetCharactersCharacterIdFittings200Ok
     */
    fittingId: number;
    /**
     * items array
     * @type {Array<GetCharactersCharacterIdFittingsItem>}
     * @memberof GetCharactersCharacterIdFittings200Ok
     */
    items: Array<GetCharactersCharacterIdFittingsItem>;
    /**
     * name string
     * @type {string}
     * @memberof GetCharactersCharacterIdFittings200Ok
     */
    name: string;
    /**
     * ship_type_id integer
     * @type {number}
     * @memberof GetCharactersCharacterIdFittings200Ok
     */
    shipTypeId: number;
}

/**
 * Check if a given object implements the GetCharactersCharacterIdFittings200Ok interface.
 */
export function instanceOfGetCharactersCharacterIdFittings200Ok(value: object): value is GetCharactersCharacterIdFittings200Ok {
    if (!('description' in value) || value['description'] === undefined) return false;
    if (!('fittingId' in value) || value['fittingId'] === undefined) return false;
    if (!('items' in value) || value['items'] === undefined) return false;
    if (!('name' in value) || value['name'] === undefined) return false;
    if (!('shipTypeId' in value) || value['shipTypeId'] === undefined) return false;
    return true;
}

export function GetCharactersCharacterIdFittings200OkFromJSON(json: any): GetCharactersCharacterIdFittings200Ok {
    return GetCharactersCharacterIdFittings200OkFromJSONTyped(json, false);
}

export function GetCharactersCharacterIdFittings200OkFromJSONTyped(json: any, ignoreDiscriminator: boolean): GetCharactersCharacterIdFittings200Ok {
    if (json == null) {
        return json;
    }
    return {
        
        'description': json['description'],
        'fittingId': json['fitting_id'],
        'items': ((json['items'] as Array<any>).map(GetCharactersCharacterIdFittingsItemFromJSON)),
        'name': json['name'],
        'shipTypeId': json['ship_type_id'],
    };
}

export function GetCharactersCharacterIdFittings200OkToJSON(json: any): GetCharactersCharacterIdFittings200Ok {
    return GetCharactersCharacterIdFittings200OkToJSONTyped(json, false);
}

export function GetCharactersCharacterIdFittings200OkToJSONTyped(value?: GetCharactersCharacterIdFittings200Ok | null, ignoreDiscriminator: boolean = false): any {
    if (value == null) {
        return value;
    }

    return {
        
        'description': value['description'],
        'fitting_id': value['fittingId'],
        'items': ((value['items'] as Array<any>).map(GetCharactersCharacterIdFittingsItemToJSON)),
        'name': value['name'],
        'ship_type_id': value['shipTypeId'],
    };
}
