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
import type { PostCharactersCharacterIdAssetsLocationsPosition } from './PostCharactersCharacterIdAssetsLocationsPosition';
import {
    PostCharactersCharacterIdAssetsLocationsPositionFromJSON,
    PostCharactersCharacterIdAssetsLocationsPositionFromJSONTyped,
    PostCharactersCharacterIdAssetsLocationsPositionToJSON,
    PostCharactersCharacterIdAssetsLocationsPositionToJSONTyped,
} from './PostCharactersCharacterIdAssetsLocationsPosition';

/**
 * 200 ok object
 * @export
 * @interface PostCharactersCharacterIdAssetsLocations200Ok
 */
export interface PostCharactersCharacterIdAssetsLocations200Ok {
    /**
     * item_id integer
     * @type {number}
     * @memberof PostCharactersCharacterIdAssetsLocations200Ok
     */
    itemId: number;
    /**
     * 
     * @type {PostCharactersCharacterIdAssetsLocationsPosition}
     * @memberof PostCharactersCharacterIdAssetsLocations200Ok
     */
    position: PostCharactersCharacterIdAssetsLocationsPosition;
}

/**
 * Check if a given object implements the PostCharactersCharacterIdAssetsLocations200Ok interface.
 */
export function instanceOfPostCharactersCharacterIdAssetsLocations200Ok(value: object): value is PostCharactersCharacterIdAssetsLocations200Ok {
    if (!('itemId' in value) || value['itemId'] === undefined) return false;
    if (!('position' in value) || value['position'] === undefined) return false;
    return true;
}

export function PostCharactersCharacterIdAssetsLocations200OkFromJSON(json: any): PostCharactersCharacterIdAssetsLocations200Ok {
    return PostCharactersCharacterIdAssetsLocations200OkFromJSONTyped(json, false);
}

export function PostCharactersCharacterIdAssetsLocations200OkFromJSONTyped(json: any, ignoreDiscriminator: boolean): PostCharactersCharacterIdAssetsLocations200Ok {
    if (json == null) {
        return json;
    }
    return {
        
        'itemId': json['item_id'],
        'position': PostCharactersCharacterIdAssetsLocationsPositionFromJSON(json['position']),
    };
}

export function PostCharactersCharacterIdAssetsLocations200OkToJSON(json: any): PostCharactersCharacterIdAssetsLocations200Ok {
    return PostCharactersCharacterIdAssetsLocations200OkToJSONTyped(json, false);
}

export function PostCharactersCharacterIdAssetsLocations200OkToJSONTyped(value?: PostCharactersCharacterIdAssetsLocations200Ok | null, ignoreDiscriminator: boolean = false): any {
    if (value == null) {
        return value;
    }

    return {
        
        'item_id': value['itemId'],
        'position': PostCharactersCharacterIdAssetsLocationsPositionToJSON(value['position']),
    };
}
