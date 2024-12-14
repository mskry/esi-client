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
 * @interface GetContractsPublicBidsContractIdNotFound
 */
export interface GetContractsPublicBidsContractIdNotFound {
    /**
     * Not found message
     * @type {string}
     * @memberof GetContractsPublicBidsContractIdNotFound
     */
    error?: string;
}

/**
 * Check if a given object implements the GetContractsPublicBidsContractIdNotFound interface.
 */
export function instanceOfGetContractsPublicBidsContractIdNotFound(value: object): value is GetContractsPublicBidsContractIdNotFound {
    return true;
}

export function GetContractsPublicBidsContractIdNotFoundFromJSON(json: any): GetContractsPublicBidsContractIdNotFound {
    return GetContractsPublicBidsContractIdNotFoundFromJSONTyped(json, false);
}

export function GetContractsPublicBidsContractIdNotFoundFromJSONTyped(json: any, ignoreDiscriminator: boolean): GetContractsPublicBidsContractIdNotFound {
    if (json == null) {
        return json;
    }
    return {
        
        'error': json['error'] == null ? undefined : json['error'],
    };
}

export function GetContractsPublicBidsContractIdNotFoundToJSON(json: any): GetContractsPublicBidsContractIdNotFound {
    return GetContractsPublicBidsContractIdNotFoundToJSONTyped(json, false);
}

export function GetContractsPublicBidsContractIdNotFoundToJSONTyped(value?: GetContractsPublicBidsContractIdNotFound | null, ignoreDiscriminator: boolean = false): any {
    if (value == null) {
        return value;
    }

    return {
        
        'error': value['error'],
    };
}

