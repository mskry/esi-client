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
 * @interface PutFleetsFleetIdSquadsSquadIdNotFound
 */
export interface PutFleetsFleetIdSquadsSquadIdNotFound {
    /**
     * Not found message
     * @type {string}
     * @memberof PutFleetsFleetIdSquadsSquadIdNotFound
     */
    error?: string;
}

/**
 * Check if a given object implements the PutFleetsFleetIdSquadsSquadIdNotFound interface.
 */
export function instanceOfPutFleetsFleetIdSquadsSquadIdNotFound(value: object): value is PutFleetsFleetIdSquadsSquadIdNotFound {
    return true;
}

export function PutFleetsFleetIdSquadsSquadIdNotFoundFromJSON(json: any): PutFleetsFleetIdSquadsSquadIdNotFound {
    return PutFleetsFleetIdSquadsSquadIdNotFoundFromJSONTyped(json, false);
}

export function PutFleetsFleetIdSquadsSquadIdNotFoundFromJSONTyped(json: any, ignoreDiscriminator: boolean): PutFleetsFleetIdSquadsSquadIdNotFound {
    if (json == null) {
        return json;
    }
    return {
        
        'error': json['error'] == null ? undefined : json['error'],
    };
}

export function PutFleetsFleetIdSquadsSquadIdNotFoundToJSON(json: any): PutFleetsFleetIdSquadsSquadIdNotFound {
    return PutFleetsFleetIdSquadsSquadIdNotFoundToJSONTyped(json, false);
}

export function PutFleetsFleetIdSquadsSquadIdNotFoundToJSONTyped(value?: PutFleetsFleetIdSquadsSquadIdNotFound | null, ignoreDiscriminator: boolean = false): any {
    if (value == null) {
        return value;
    }

    return {
        
        'error': value['error'],
    };
}

