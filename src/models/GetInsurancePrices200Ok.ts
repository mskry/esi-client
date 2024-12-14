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
import type { GetInsurancePricesLevel } from './GetInsurancePricesLevel';
import {
    GetInsurancePricesLevelFromJSON,
    GetInsurancePricesLevelFromJSONTyped,
    GetInsurancePricesLevelToJSON,
    GetInsurancePricesLevelToJSONTyped,
} from './GetInsurancePricesLevel';

/**
 * 200 ok object
 * @export
 * @interface GetInsurancePrices200Ok
 */
export interface GetInsurancePrices200Ok {
    /**
     * A list of a available insurance levels for this ship type
     * @type {Array<GetInsurancePricesLevel>}
     * @memberof GetInsurancePrices200Ok
     */
    levels: Array<GetInsurancePricesLevel>;
    /**
     * type_id integer
     * @type {number}
     * @memberof GetInsurancePrices200Ok
     */
    typeId: number;
}

/**
 * Check if a given object implements the GetInsurancePrices200Ok interface.
 */
export function instanceOfGetInsurancePrices200Ok(value: object): value is GetInsurancePrices200Ok {
    if (!('levels' in value) || value['levels'] === undefined) return false;
    if (!('typeId' in value) || value['typeId'] === undefined) return false;
    return true;
}

export function GetInsurancePrices200OkFromJSON(json: any): GetInsurancePrices200Ok {
    return GetInsurancePrices200OkFromJSONTyped(json, false);
}

export function GetInsurancePrices200OkFromJSONTyped(json: any, ignoreDiscriminator: boolean): GetInsurancePrices200Ok {
    if (json == null) {
        return json;
    }
    return {
        
        'levels': ((json['levels'] as Array<any>).map(GetInsurancePricesLevelFromJSON)),
        'typeId': json['type_id'],
    };
}

export function GetInsurancePrices200OkToJSON(json: any): GetInsurancePrices200Ok {
    return GetInsurancePrices200OkToJSONTyped(json, false);
}

export function GetInsurancePrices200OkToJSONTyped(value?: GetInsurancePrices200Ok | null, ignoreDiscriminator: boolean = false): any {
    if (value == null) {
        return value;
    }

    return {
        
        'levels': ((value['levels'] as Array<any>).map(GetInsurancePricesLevelToJSON)),
        'type_id': value['typeId'],
    };
}

