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
 * @interface GetUniverseAsteroidBeltsAsteroidBeltIdPosition
 */
export interface GetUniverseAsteroidBeltsAsteroidBeltIdPosition {
    /**
     * x number
     * @type {number}
     * @memberof GetUniverseAsteroidBeltsAsteroidBeltIdPosition
     */
    x: number;
    /**
     * y number
     * @type {number}
     * @memberof GetUniverseAsteroidBeltsAsteroidBeltIdPosition
     */
    y: number;
    /**
     * z number
     * @type {number}
     * @memberof GetUniverseAsteroidBeltsAsteroidBeltIdPosition
     */
    z: number;
}

/**
 * Check if a given object implements the GetUniverseAsteroidBeltsAsteroidBeltIdPosition interface.
 */
export function instanceOfGetUniverseAsteroidBeltsAsteroidBeltIdPosition(value: object): value is GetUniverseAsteroidBeltsAsteroidBeltIdPosition {
    if (!('x' in value) || value['x'] === undefined) return false;
    if (!('y' in value) || value['y'] === undefined) return false;
    if (!('z' in value) || value['z'] === undefined) return false;
    return true;
}

export function GetUniverseAsteroidBeltsAsteroidBeltIdPositionFromJSON(json: any): GetUniverseAsteroidBeltsAsteroidBeltIdPosition {
    return GetUniverseAsteroidBeltsAsteroidBeltIdPositionFromJSONTyped(json, false);
}

export function GetUniverseAsteroidBeltsAsteroidBeltIdPositionFromJSONTyped(json: any, ignoreDiscriminator: boolean): GetUniverseAsteroidBeltsAsteroidBeltIdPosition {
    if (json == null) {
        return json;
    }
    return {
        
        'x': json['x'],
        'y': json['y'],
        'z': json['z'],
    };
}

export function GetUniverseAsteroidBeltsAsteroidBeltIdPositionToJSON(json: any): GetUniverseAsteroidBeltsAsteroidBeltIdPosition {
    return GetUniverseAsteroidBeltsAsteroidBeltIdPositionToJSONTyped(json, false);
}

export function GetUniverseAsteroidBeltsAsteroidBeltIdPositionToJSONTyped(value?: GetUniverseAsteroidBeltsAsteroidBeltIdPosition | null, ignoreDiscriminator: boolean = false): any {
    if (value == null) {
        return value;
    }

    return {
        
        'x': value['x'],
        'y': value['y'],
        'z': value['z'],
    };
}

