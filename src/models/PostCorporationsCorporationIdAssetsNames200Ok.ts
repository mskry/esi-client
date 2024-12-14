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
 * @interface PostCorporationsCorporationIdAssetsNames200Ok
 */
export interface PostCorporationsCorporationIdAssetsNames200Ok {
    /**
     * item_id integer
     * @type {number}
     * @memberof PostCorporationsCorporationIdAssetsNames200Ok
     */
    itemId: number;
    /**
     * name string
     * @type {string}
     * @memberof PostCorporationsCorporationIdAssetsNames200Ok
     */
    name: string;
}

/**
 * Check if a given object implements the PostCorporationsCorporationIdAssetsNames200Ok interface.
 */
export function instanceOfPostCorporationsCorporationIdAssetsNames200Ok(value: object): value is PostCorporationsCorporationIdAssetsNames200Ok {
    if (!('itemId' in value) || value['itemId'] === undefined) return false;
    if (!('name' in value) || value['name'] === undefined) return false;
    return true;
}

export function PostCorporationsCorporationIdAssetsNames200OkFromJSON(json: any): PostCorporationsCorporationIdAssetsNames200Ok {
    return PostCorporationsCorporationIdAssetsNames200OkFromJSONTyped(json, false);
}

export function PostCorporationsCorporationIdAssetsNames200OkFromJSONTyped(json: any, ignoreDiscriminator: boolean): PostCorporationsCorporationIdAssetsNames200Ok {
    if (json == null) {
        return json;
    }
    return {
        
        'itemId': json['item_id'],
        'name': json['name'],
    };
}

export function PostCorporationsCorporationIdAssetsNames200OkToJSON(json: any): PostCorporationsCorporationIdAssetsNames200Ok {
    return PostCorporationsCorporationIdAssetsNames200OkToJSONTyped(json, false);
}

export function PostCorporationsCorporationIdAssetsNames200OkToJSONTyped(value?: PostCorporationsCorporationIdAssetsNames200Ok | null, ignoreDiscriminator: boolean = false): any {
    if (value == null) {
        return value;
    }

    return {
        
        'item_id': value['itemId'],
        'name': value['name'],
    };
}

