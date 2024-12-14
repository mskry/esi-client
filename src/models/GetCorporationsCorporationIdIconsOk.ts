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
 * 200 ok object
 * @export
 * @interface GetCorporationsCorporationIdIconsOk
 */
export interface GetCorporationsCorporationIdIconsOk {
    /**
     * px128x128 string
     * @type {string}
     * @memberof GetCorporationsCorporationIdIconsOk
     */
    px128x128?: string;
    /**
     * px256x256 string
     * @type {string}
     * @memberof GetCorporationsCorporationIdIconsOk
     */
    px256x256?: string;
    /**
     * px64x64 string
     * @type {string}
     * @memberof GetCorporationsCorporationIdIconsOk
     */
    px64x64?: string;
}

/**
 * Check if a given object implements the GetCorporationsCorporationIdIconsOk interface.
 */
export function instanceOfGetCorporationsCorporationIdIconsOk(value: object): value is GetCorporationsCorporationIdIconsOk {
    return true;
}

export function GetCorporationsCorporationIdIconsOkFromJSON(json: any): GetCorporationsCorporationIdIconsOk {
    return GetCorporationsCorporationIdIconsOkFromJSONTyped(json, false);
}

export function GetCorporationsCorporationIdIconsOkFromJSONTyped(json: any, ignoreDiscriminator: boolean): GetCorporationsCorporationIdIconsOk {
    if (json == null) {
        return json;
    }
    return {
        
        'px128x128': json['px128x128'] == null ? undefined : json['px128x128'],
        'px256x256': json['px256x256'] == null ? undefined : json['px256x256'],
        'px64x64': json['px64x64'] == null ? undefined : json['px64x64'],
    };
}

export function GetCorporationsCorporationIdIconsOkToJSON(json: any): GetCorporationsCorporationIdIconsOk {
    return GetCorporationsCorporationIdIconsOkToJSONTyped(json, false);
}

export function GetCorporationsCorporationIdIconsOkToJSONTyped(value?: GetCorporationsCorporationIdIconsOk | null, ignoreDiscriminator: boolean = false): any {
    if (value == null) {
        return value;
    }

    return {
        
        'px128x128': value['px128x128'],
        'px256x256': value['px256x256'],
        'px64x64': value['px64x64'],
    };
}

