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
 * @interface PostUniverseNames200Ok
 */
export interface PostUniverseNames200Ok {
    /**
     * category string
     * @type {string}
     * @memberof PostUniverseNames200Ok
     */
    category: PostUniverseNames200OkCategoryEnum;
    /**
     * id integer
     * @type {number}
     * @memberof PostUniverseNames200Ok
     */
    id: number;
    /**
     * name string
     * @type {string}
     * @memberof PostUniverseNames200Ok
     */
    name: string;
}


/**
 * @export
 */
export const PostUniverseNames200OkCategoryEnum = {
    Alliance: 'alliance',
    Character: 'character',
    Constellation: 'constellation',
    Corporation: 'corporation',
    InventoryType: 'inventory_type',
    Region: 'region',
    SolarSystem: 'solar_system',
    Station: 'station',
    Faction: 'faction'
} as const;
export type PostUniverseNames200OkCategoryEnum = typeof PostUniverseNames200OkCategoryEnum[keyof typeof PostUniverseNames200OkCategoryEnum];


/**
 * Check if a given object implements the PostUniverseNames200Ok interface.
 */
export function instanceOfPostUniverseNames200Ok(value: object): value is PostUniverseNames200Ok {
    if (!('category' in value) || value['category'] === undefined) return false;
    if (!('id' in value) || value['id'] === undefined) return false;
    if (!('name' in value) || value['name'] === undefined) return false;
    return true;
}

export function PostUniverseNames200OkFromJSON(json: any): PostUniverseNames200Ok {
    return PostUniverseNames200OkFromJSONTyped(json, false);
}

export function PostUniverseNames200OkFromJSONTyped(json: any, ignoreDiscriminator: boolean): PostUniverseNames200Ok {
    if (json == null) {
        return json;
    }
    return {
        
        'category': json['category'],
        'id': json['id'],
        'name': json['name'],
    };
}

export function PostUniverseNames200OkToJSON(json: any): PostUniverseNames200Ok {
    return PostUniverseNames200OkToJSONTyped(json, false);
}

export function PostUniverseNames200OkToJSONTyped(value?: PostUniverseNames200Ok | null, ignoreDiscriminator: boolean = false): any {
    if (value == null) {
        return value;
    }

    return {
        
        'category': value['category'],
        'id': value['id'],
        'name': value['name'],
    };
}
