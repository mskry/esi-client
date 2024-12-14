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
 * Not found
 * @export
 * @interface GetUniversePlanetsPlanetIdNotFound
 */
export interface GetUniversePlanetsPlanetIdNotFound {
    /**
     * Not found message
     * @type {string}
     * @memberof GetUniversePlanetsPlanetIdNotFound
     */
    error?: string;
}

/**
 * Check if a given object implements the GetUniversePlanetsPlanetIdNotFound interface.
 */
export function instanceOfGetUniversePlanetsPlanetIdNotFound(value: object): value is GetUniversePlanetsPlanetIdNotFound {
    return true;
}

export function GetUniversePlanetsPlanetIdNotFoundFromJSON(json: any): GetUniversePlanetsPlanetIdNotFound {
    return GetUniversePlanetsPlanetIdNotFoundFromJSONTyped(json, false);
}

export function GetUniversePlanetsPlanetIdNotFoundFromJSONTyped(json: any, ignoreDiscriminator: boolean): GetUniversePlanetsPlanetIdNotFound {
    if (json == null) {
        return json;
    }
    return {
        
        'error': json['error'] == null ? undefined : json['error'],
    };
}

export function GetUniversePlanetsPlanetIdNotFoundToJSON(json: any): GetUniversePlanetsPlanetIdNotFound {
    return GetUniversePlanetsPlanetIdNotFoundToJSONTyped(json, false);
}

export function GetUniversePlanetsPlanetIdNotFoundToJSONTyped(value?: GetUniversePlanetsPlanetIdNotFound | null, ignoreDiscriminator: boolean = false): any {
    if (value == null) {
        return value;
    }

    return {
        
        'error': value['error'],
    };
}
