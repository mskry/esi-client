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
 * Optional object that is returned if a bookmark was made on a planet or a random location in space.
 * @export
 * @interface GetCorporationsCorporationIdBookmarksCoordinates
 */
export interface GetCorporationsCorporationIdBookmarksCoordinates {
    /**
     * x number
     * @type {number}
     * @memberof GetCorporationsCorporationIdBookmarksCoordinates
     */
    x: number;
    /**
     * y number
     * @type {number}
     * @memberof GetCorporationsCorporationIdBookmarksCoordinates
     */
    y: number;
    /**
     * z number
     * @type {number}
     * @memberof GetCorporationsCorporationIdBookmarksCoordinates
     */
    z: number;
}

/**
 * Check if a given object implements the GetCorporationsCorporationIdBookmarksCoordinates interface.
 */
export function instanceOfGetCorporationsCorporationIdBookmarksCoordinates(value: object): value is GetCorporationsCorporationIdBookmarksCoordinates {
    if (!('x' in value) || value['x'] === undefined) return false;
    if (!('y' in value) || value['y'] === undefined) return false;
    if (!('z' in value) || value['z'] === undefined) return false;
    return true;
}

export function GetCorporationsCorporationIdBookmarksCoordinatesFromJSON(json: any): GetCorporationsCorporationIdBookmarksCoordinates {
    return GetCorporationsCorporationIdBookmarksCoordinatesFromJSONTyped(json, false);
}

export function GetCorporationsCorporationIdBookmarksCoordinatesFromJSONTyped(json: any, ignoreDiscriminator: boolean): GetCorporationsCorporationIdBookmarksCoordinates {
    if (json == null) {
        return json;
    }
    return {
        
        'x': json['x'],
        'y': json['y'],
        'z': json['z'],
    };
}

export function GetCorporationsCorporationIdBookmarksCoordinatesToJSON(json: any): GetCorporationsCorporationIdBookmarksCoordinates {
    return GetCorporationsCorporationIdBookmarksCoordinatesToJSONTyped(json, false);
}

export function GetCorporationsCorporationIdBookmarksCoordinatesToJSONTyped(value?: GetCorporationsCorporationIdBookmarksCoordinates | null, ignoreDiscriminator: boolean = false): any {
    if (value == null) {
        return value;
    }

    return {
        
        'x': value['x'],
        'y': value['y'],
        'z': value['z'],
    };
}

