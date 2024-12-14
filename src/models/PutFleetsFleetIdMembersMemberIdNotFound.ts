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
 * @interface PutFleetsFleetIdMembersMemberIdNotFound
 */
export interface PutFleetsFleetIdMembersMemberIdNotFound {
    /**
     * Not found message
     * @type {string}
     * @memberof PutFleetsFleetIdMembersMemberIdNotFound
     */
    error?: string;
}

/**
 * Check if a given object implements the PutFleetsFleetIdMembersMemberIdNotFound interface.
 */
export function instanceOfPutFleetsFleetIdMembersMemberIdNotFound(value: object): value is PutFleetsFleetIdMembersMemberIdNotFound {
    return true;
}

export function PutFleetsFleetIdMembersMemberIdNotFoundFromJSON(json: any): PutFleetsFleetIdMembersMemberIdNotFound {
    return PutFleetsFleetIdMembersMemberIdNotFoundFromJSONTyped(json, false);
}

export function PutFleetsFleetIdMembersMemberIdNotFoundFromJSONTyped(json: any, ignoreDiscriminator: boolean): PutFleetsFleetIdMembersMemberIdNotFound {
    if (json == null) {
        return json;
    }
    return {
        
        'error': json['error'] == null ? undefined : json['error'],
    };
}

export function PutFleetsFleetIdMembersMemberIdNotFoundToJSON(json: any): PutFleetsFleetIdMembersMemberIdNotFound {
    return PutFleetsFleetIdMembersMemberIdNotFoundToJSONTyped(json, false);
}

export function PutFleetsFleetIdMembersMemberIdNotFoundToJSONTyped(value?: PutFleetsFleetIdMembersMemberIdNotFound | null, ignoreDiscriminator: boolean = false): any {
    if (value == null) {
        return value;
    }

    return {
        
        'error': value['error'],
    };
}
