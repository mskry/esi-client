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
 * @interface PutFleetsFleetIdNotFound
 */
export interface PutFleetsFleetIdNotFound {
    /**
     * Not found message
     * @type {string}
     * @memberof PutFleetsFleetIdNotFound
     */
    error?: string;
}

/**
 * Check if a given object implements the PutFleetsFleetIdNotFound interface.
 */
export function instanceOfPutFleetsFleetIdNotFound(value: object): value is PutFleetsFleetIdNotFound {
    return true;
}

export function PutFleetsFleetIdNotFoundFromJSON(json: any): PutFleetsFleetIdNotFound {
    return PutFleetsFleetIdNotFoundFromJSONTyped(json, false);
}

export function PutFleetsFleetIdNotFoundFromJSONTyped(json: any, ignoreDiscriminator: boolean): PutFleetsFleetIdNotFound {
    if (json == null) {
        return json;
    }
    return {
        
        'error': json['error'] == null ? undefined : json['error'],
    };
}

export function PutFleetsFleetIdNotFoundToJSON(json: any): PutFleetsFleetIdNotFound {
    return PutFleetsFleetIdNotFoundToJSONTyped(json, false);
}

export function PutFleetsFleetIdNotFoundToJSONTyped(value?: PutFleetsFleetIdNotFound | null, ignoreDiscriminator: boolean = false): any {
    if (value == null) {
        return value;
    }

    return {
        
        'error': value['error'],
    };
}
