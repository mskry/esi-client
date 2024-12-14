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
import type { GetUniverseAsteroidBeltsAsteroidBeltIdPosition } from './GetUniverseAsteroidBeltsAsteroidBeltIdPosition';
import {
    GetUniverseAsteroidBeltsAsteroidBeltIdPositionFromJSON,
    GetUniverseAsteroidBeltsAsteroidBeltIdPositionFromJSONTyped,
    GetUniverseAsteroidBeltsAsteroidBeltIdPositionToJSON,
    GetUniverseAsteroidBeltsAsteroidBeltIdPositionToJSONTyped,
} from './GetUniverseAsteroidBeltsAsteroidBeltIdPosition';

/**
 * 200 ok object
 * @export
 * @interface GetUniverseAsteroidBeltsAsteroidBeltIdOk
 */
export interface GetUniverseAsteroidBeltsAsteroidBeltIdOk {
    /**
     * name string
     * @type {string}
     * @memberof GetUniverseAsteroidBeltsAsteroidBeltIdOk
     */
    name: string;
    /**
     * 
     * @type {GetUniverseAsteroidBeltsAsteroidBeltIdPosition}
     * @memberof GetUniverseAsteroidBeltsAsteroidBeltIdOk
     */
    position: GetUniverseAsteroidBeltsAsteroidBeltIdPosition;
    /**
     * The solar system this asteroid belt is in
     * @type {number}
     * @memberof GetUniverseAsteroidBeltsAsteroidBeltIdOk
     */
    systemId: number;
}

/**
 * Check if a given object implements the GetUniverseAsteroidBeltsAsteroidBeltIdOk interface.
 */
export function instanceOfGetUniverseAsteroidBeltsAsteroidBeltIdOk(value: object): value is GetUniverseAsteroidBeltsAsteroidBeltIdOk {
    if (!('name' in value) || value['name'] === undefined) return false;
    if (!('position' in value) || value['position'] === undefined) return false;
    if (!('systemId' in value) || value['systemId'] === undefined) return false;
    return true;
}

export function GetUniverseAsteroidBeltsAsteroidBeltIdOkFromJSON(json: any): GetUniverseAsteroidBeltsAsteroidBeltIdOk {
    return GetUniverseAsteroidBeltsAsteroidBeltIdOkFromJSONTyped(json, false);
}

export function GetUniverseAsteroidBeltsAsteroidBeltIdOkFromJSONTyped(json: any, ignoreDiscriminator: boolean): GetUniverseAsteroidBeltsAsteroidBeltIdOk {
    if (json == null) {
        return json;
    }
    return {
        
        'name': json['name'],
        'position': GetUniverseAsteroidBeltsAsteroidBeltIdPositionFromJSON(json['position']),
        'systemId': json['system_id'],
    };
}

export function GetUniverseAsteroidBeltsAsteroidBeltIdOkToJSON(json: any): GetUniverseAsteroidBeltsAsteroidBeltIdOk {
    return GetUniverseAsteroidBeltsAsteroidBeltIdOkToJSONTyped(json, false);
}

export function GetUniverseAsteroidBeltsAsteroidBeltIdOkToJSONTyped(value?: GetUniverseAsteroidBeltsAsteroidBeltIdOk | null, ignoreDiscriminator: boolean = false): any {
    if (value == null) {
        return value;
    }

    return {
        
        'name': value['name'],
        'position': GetUniverseAsteroidBeltsAsteroidBeltIdPositionToJSON(value['position']),
        'system_id': value['systemId'],
    };
}

