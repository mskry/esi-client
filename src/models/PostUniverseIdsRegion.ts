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
 * region object
 * @export
 * @interface PostUniverseIdsRegion
 */
export interface PostUniverseIdsRegion {
    /**
     * id integer
     * @type {number}
     * @memberof PostUniverseIdsRegion
     */
    id?: number;
    /**
     * name string
     * @type {string}
     * @memberof PostUniverseIdsRegion
     */
    name?: string;
}

/**
 * Check if a given object implements the PostUniverseIdsRegion interface.
 */
export function instanceOfPostUniverseIdsRegion(value: object): value is PostUniverseIdsRegion {
    return true;
}

export function PostUniverseIdsRegionFromJSON(json: any): PostUniverseIdsRegion {
    return PostUniverseIdsRegionFromJSONTyped(json, false);
}

export function PostUniverseIdsRegionFromJSONTyped(json: any, ignoreDiscriminator: boolean): PostUniverseIdsRegion {
    if (json == null) {
        return json;
    }
    return {
        
        'id': json['id'] == null ? undefined : json['id'],
        'name': json['name'] == null ? undefined : json['name'],
    };
}

export function PostUniverseIdsRegionToJSON(json: any): PostUniverseIdsRegion {
    return PostUniverseIdsRegionToJSONTyped(json, false);
}

export function PostUniverseIdsRegionToJSONTyped(value?: PostUniverseIdsRegion | null, ignoreDiscriminator: boolean = false): any {
    if (value == null) {
        return value;
    }

    return {
        
        'id': value['id'],
        'name': value['name'],
    };
}
