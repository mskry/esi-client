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
 * @interface GetCorporationsCorporationIdContractsContractIdBidsNotFound
 */
export interface GetCorporationsCorporationIdContractsContractIdBidsNotFound {
    /**
     * Not found message
     * @type {string}
     * @memberof GetCorporationsCorporationIdContractsContractIdBidsNotFound
     */
    error?: string;
}

/**
 * Check if a given object implements the GetCorporationsCorporationIdContractsContractIdBidsNotFound interface.
 */
export function instanceOfGetCorporationsCorporationIdContractsContractIdBidsNotFound(value: object): value is GetCorporationsCorporationIdContractsContractIdBidsNotFound {
    return true;
}

export function GetCorporationsCorporationIdContractsContractIdBidsNotFoundFromJSON(json: any): GetCorporationsCorporationIdContractsContractIdBidsNotFound {
    return GetCorporationsCorporationIdContractsContractIdBidsNotFoundFromJSONTyped(json, false);
}

export function GetCorporationsCorporationIdContractsContractIdBidsNotFoundFromJSONTyped(json: any, ignoreDiscriminator: boolean): GetCorporationsCorporationIdContractsContractIdBidsNotFound {
    if (json == null) {
        return json;
    }
    return {
        
        'error': json['error'] == null ? undefined : json['error'],
    };
}

export function GetCorporationsCorporationIdContractsContractIdBidsNotFoundToJSON(json: any): GetCorporationsCorporationIdContractsContractIdBidsNotFound {
    return GetCorporationsCorporationIdContractsContractIdBidsNotFoundToJSONTyped(json, false);
}

export function GetCorporationsCorporationIdContractsContractIdBidsNotFoundToJSONTyped(value?: GetCorporationsCorporationIdContractsContractIdBidsNotFound | null, ignoreDiscriminator: boolean = false): any {
    if (value == null) {
        return value;
    }

    return {
        
        'error': value['error'],
    };
}
