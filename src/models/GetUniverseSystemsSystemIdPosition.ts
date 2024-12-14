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
 * @interface GetUniverseSystemsSystemIdPosition
 */
export interface GetUniverseSystemsSystemIdPosition {
    /**
     * x number
     * @type {number}
     * @memberof GetUniverseSystemsSystemIdPosition
     */
    x: number;
    /**
     * y number
     * @type {number}
     * @memberof GetUniverseSystemsSystemIdPosition
     */
    y: number;
    /**
     * z number
     * @type {number}
     * @memberof GetUniverseSystemsSystemIdPosition
     */
    z: number;
}

/**
 * Check if a given object implements the GetUniverseSystemsSystemIdPosition interface.
 */
export function instanceOfGetUniverseSystemsSystemIdPosition(value: object): value is GetUniverseSystemsSystemIdPosition {
    if (!('x' in value) || value['x'] === undefined) return false;
    if (!('y' in value) || value['y'] === undefined) return false;
    if (!('z' in value) || value['z'] === undefined) return false;
    return true;
}

export function GetUniverseSystemsSystemIdPositionFromJSON(json: any): GetUniverseSystemsSystemIdPosition {
    return GetUniverseSystemsSystemIdPositionFromJSONTyped(json, false);
}

export function GetUniverseSystemsSystemIdPositionFromJSONTyped(json: any, ignoreDiscriminator: boolean): GetUniverseSystemsSystemIdPosition {
    if (json == null) {
        return json;
    }
    return {
        
        'x': json['x'],
        'y': json['y'],
        'z': json['z'],
    };
}

export function GetUniverseSystemsSystemIdPositionToJSON(json: any): GetUniverseSystemsSystemIdPosition {
    return GetUniverseSystemsSystemIdPositionToJSONTyped(json, false);
}

export function GetUniverseSystemsSystemIdPositionToJSONTyped(value?: GetUniverseSystemsSystemIdPosition | null, ignoreDiscriminator: boolean = false): any {
    if (value == null) {
        return value;
    }

    return {
        
        'x': value['x'],
        'y': value['y'],
        'z': value['z'],
    };
}
