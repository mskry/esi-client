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
 * dogma_effect object
 * @export
 * @interface GetDogmaDynamicItemsTypeIdItemIdDogmaEffect
 */
export interface GetDogmaDynamicItemsTypeIdItemIdDogmaEffect {
    /**
     * effect_id integer
     * @type {number}
     * @memberof GetDogmaDynamicItemsTypeIdItemIdDogmaEffect
     */
    effectId: number;
    /**
     * is_default boolean
     * @type {boolean}
     * @memberof GetDogmaDynamicItemsTypeIdItemIdDogmaEffect
     */
    isDefault: boolean;
}

/**
 * Check if a given object implements the GetDogmaDynamicItemsTypeIdItemIdDogmaEffect interface.
 */
export function instanceOfGetDogmaDynamicItemsTypeIdItemIdDogmaEffect(value: object): value is GetDogmaDynamicItemsTypeIdItemIdDogmaEffect {
    if (!('effectId' in value) || value['effectId'] === undefined) return false;
    if (!('isDefault' in value) || value['isDefault'] === undefined) return false;
    return true;
}

export function GetDogmaDynamicItemsTypeIdItemIdDogmaEffectFromJSON(json: any): GetDogmaDynamicItemsTypeIdItemIdDogmaEffect {
    return GetDogmaDynamicItemsTypeIdItemIdDogmaEffectFromJSONTyped(json, false);
}

export function GetDogmaDynamicItemsTypeIdItemIdDogmaEffectFromJSONTyped(json: any, ignoreDiscriminator: boolean): GetDogmaDynamicItemsTypeIdItemIdDogmaEffect {
    if (json == null) {
        return json;
    }
    return {
        
        'effectId': json['effect_id'],
        'isDefault': json['is_default'],
    };
}

export function GetDogmaDynamicItemsTypeIdItemIdDogmaEffectToJSON(json: any): GetDogmaDynamicItemsTypeIdItemIdDogmaEffect {
    return GetDogmaDynamicItemsTypeIdItemIdDogmaEffectToJSONTyped(json, false);
}

export function GetDogmaDynamicItemsTypeIdItemIdDogmaEffectToJSONTyped(value?: GetDogmaDynamicItemsTypeIdItemIdDogmaEffect | null, ignoreDiscriminator: boolean = false): any {
    if (value == null) {
        return value;
    }

    return {
        
        'effect_id': value['effectId'],
        'is_default': value['isDefault'],
    };
}
