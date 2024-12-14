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
 * position object
 * @export
 * @interface GetUniversePlanetsPlanetIdPosition
 */
export interface GetUniversePlanetsPlanetIdPosition {
    /**
     * x number
     * @type {number}
     * @memberof GetUniversePlanetsPlanetIdPosition
     */
    x: number;
    /**
     * y number
     * @type {number}
     * @memberof GetUniversePlanetsPlanetIdPosition
     */
    y: number;
    /**
     * z number
     * @type {number}
     * @memberof GetUniversePlanetsPlanetIdPosition
     */
    z: number;
}

/**
 * Check if a given object implements the GetUniversePlanetsPlanetIdPosition interface.
 */
export function instanceOfGetUniversePlanetsPlanetIdPosition(value: object): value is GetUniversePlanetsPlanetIdPosition {
    if (!('x' in value) || value['x'] === undefined) return false;
    if (!('y' in value) || value['y'] === undefined) return false;
    if (!('z' in value) || value['z'] === undefined) return false;
    return true;
}

export function GetUniversePlanetsPlanetIdPositionFromJSON(json: any): GetUniversePlanetsPlanetIdPosition {
    return GetUniversePlanetsPlanetIdPositionFromJSONTyped(json, false);
}

export function GetUniversePlanetsPlanetIdPositionFromJSONTyped(json: any, ignoreDiscriminator: boolean): GetUniversePlanetsPlanetIdPosition {
    if (json == null) {
        return json;
    }
    return {
        
        'x': json['x'],
        'y': json['y'],
        'z': json['z'],
    };
}

export function GetUniversePlanetsPlanetIdPositionToJSON(json: any): GetUniversePlanetsPlanetIdPosition {
    return GetUniversePlanetsPlanetIdPositionToJSONTyped(json, false);
}

export function GetUniversePlanetsPlanetIdPositionToJSONTyped(value?: GetUniversePlanetsPlanetIdPosition | null, ignoreDiscriminator: boolean = false): any {
    if (value == null) {
        return value;
    }

    return {
        
        'x': value['x'],
        'y': value['y'],
        'z': value['z'],
    };
}

