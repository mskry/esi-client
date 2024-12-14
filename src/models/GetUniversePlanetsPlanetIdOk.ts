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
import type { GetUniversePlanetsPlanetIdPosition } from './GetUniversePlanetsPlanetIdPosition';
import {
    GetUniversePlanetsPlanetIdPositionFromJSON,
    GetUniversePlanetsPlanetIdPositionFromJSONTyped,
    GetUniversePlanetsPlanetIdPositionToJSON,
    GetUniversePlanetsPlanetIdPositionToJSONTyped,
} from './GetUniversePlanetsPlanetIdPosition';

/**
 * 200 ok object
 * @export
 * @interface GetUniversePlanetsPlanetIdOk
 */
export interface GetUniversePlanetsPlanetIdOk {
    /**
     * name string
     * @type {string}
     * @memberof GetUniversePlanetsPlanetIdOk
     */
    name: string;
    /**
     * planet_id integer
     * @type {number}
     * @memberof GetUniversePlanetsPlanetIdOk
     */
    planetId: number;
    /**
     * 
     * @type {GetUniversePlanetsPlanetIdPosition}
     * @memberof GetUniversePlanetsPlanetIdOk
     */
    position: GetUniversePlanetsPlanetIdPosition;
    /**
     * The solar system this planet is in
     * @type {number}
     * @memberof GetUniversePlanetsPlanetIdOk
     */
    systemId: number;
    /**
     * type_id integer
     * @type {number}
     * @memberof GetUniversePlanetsPlanetIdOk
     */
    typeId: number;
}

/**
 * Check if a given object implements the GetUniversePlanetsPlanetIdOk interface.
 */
export function instanceOfGetUniversePlanetsPlanetIdOk(value: object): value is GetUniversePlanetsPlanetIdOk {
    if (!('name' in value) || value['name'] === undefined) return false;
    if (!('planetId' in value) || value['planetId'] === undefined) return false;
    if (!('position' in value) || value['position'] === undefined) return false;
    if (!('systemId' in value) || value['systemId'] === undefined) return false;
    if (!('typeId' in value) || value['typeId'] === undefined) return false;
    return true;
}

export function GetUniversePlanetsPlanetIdOkFromJSON(json: any): GetUniversePlanetsPlanetIdOk {
    return GetUniversePlanetsPlanetIdOkFromJSONTyped(json, false);
}

export function GetUniversePlanetsPlanetIdOkFromJSONTyped(json: any, ignoreDiscriminator: boolean): GetUniversePlanetsPlanetIdOk {
    if (json == null) {
        return json;
    }
    return {
        
        'name': json['name'],
        'planetId': json['planet_id'],
        'position': GetUniversePlanetsPlanetIdPositionFromJSON(json['position']),
        'systemId': json['system_id'],
        'typeId': json['type_id'],
    };
}

export function GetUniversePlanetsPlanetIdOkToJSON(json: any): GetUniversePlanetsPlanetIdOk {
    return GetUniversePlanetsPlanetIdOkToJSONTyped(json, false);
}

export function GetUniversePlanetsPlanetIdOkToJSONTyped(value?: GetUniversePlanetsPlanetIdOk | null, ignoreDiscriminator: boolean = false): any {
    if (value == null) {
        return value;
    }

    return {
        
        'name': value['name'],
        'planet_id': value['planetId'],
        'position': GetUniversePlanetsPlanetIdPositionToJSON(value['position']),
        'system_id': value['systemId'],
        'type_id': value['typeId'],
    };
}

