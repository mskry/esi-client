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
 * @interface GetUniverseMoonsMoonIdPosition
 */
export interface GetUniverseMoonsMoonIdPosition {
    /**
     * x number
     * @type {number}
     * @memberof GetUniverseMoonsMoonIdPosition
     */
    x: number;
    /**
     * y number
     * @type {number}
     * @memberof GetUniverseMoonsMoonIdPosition
     */
    y: number;
    /**
     * z number
     * @type {number}
     * @memberof GetUniverseMoonsMoonIdPosition
     */
    z: number;
}

/**
 * Check if a given object implements the GetUniverseMoonsMoonIdPosition interface.
 */
export function instanceOfGetUniverseMoonsMoonIdPosition(value: object): value is GetUniverseMoonsMoonIdPosition {
    if (!('x' in value) || value['x'] === undefined) return false;
    if (!('y' in value) || value['y'] === undefined) return false;
    if (!('z' in value) || value['z'] === undefined) return false;
    return true;
}

export function GetUniverseMoonsMoonIdPositionFromJSON(json: any): GetUniverseMoonsMoonIdPosition {
    return GetUniverseMoonsMoonIdPositionFromJSONTyped(json, false);
}

export function GetUniverseMoonsMoonIdPositionFromJSONTyped(json: any, ignoreDiscriminator: boolean): GetUniverseMoonsMoonIdPosition {
    if (json == null) {
        return json;
    }
    return {
        
        'x': json['x'],
        'y': json['y'],
        'z': json['z'],
    };
}

export function GetUniverseMoonsMoonIdPositionToJSON(json: any): GetUniverseMoonsMoonIdPosition {
    return GetUniverseMoonsMoonIdPositionToJSONTyped(json, false);
}

export function GetUniverseMoonsMoonIdPositionToJSONTyped(value?: GetUniverseMoonsMoonIdPosition | null, ignoreDiscriminator: boolean = false): any {
    if (value == null) {
        return value;
    }

    return {
        
        'x': value['x'],
        'y': value['y'],
        'z': value['z'],
    };
}

