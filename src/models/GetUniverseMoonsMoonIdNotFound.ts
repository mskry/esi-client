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
 * @interface GetUniverseMoonsMoonIdNotFound
 */
export interface GetUniverseMoonsMoonIdNotFound {
    /**
     * Not found message
     * @type {string}
     * @memberof GetUniverseMoonsMoonIdNotFound
     */
    error?: string;
}

/**
 * Check if a given object implements the GetUniverseMoonsMoonIdNotFound interface.
 */
export function instanceOfGetUniverseMoonsMoonIdNotFound(value: object): value is GetUniverseMoonsMoonIdNotFound {
    return true;
}

export function GetUniverseMoonsMoonIdNotFoundFromJSON(json: any): GetUniverseMoonsMoonIdNotFound {
    return GetUniverseMoonsMoonIdNotFoundFromJSONTyped(json, false);
}

export function GetUniverseMoonsMoonIdNotFoundFromJSONTyped(json: any, ignoreDiscriminator: boolean): GetUniverseMoonsMoonIdNotFound {
    if (json == null) {
        return json;
    }
    return {
        
        'error': json['error'] == null ? undefined : json['error'],
    };
}

export function GetUniverseMoonsMoonIdNotFoundToJSON(json: any): GetUniverseMoonsMoonIdNotFound {
    return GetUniverseMoonsMoonIdNotFoundToJSONTyped(json, false);
}

export function GetUniverseMoonsMoonIdNotFoundToJSONTyped(value?: GetUniverseMoonsMoonIdNotFound | null, ignoreDiscriminator: boolean = false): any {
    if (value == null) {
        return value;
    }

    return {
        
        'error': value['error'],
    };
}

