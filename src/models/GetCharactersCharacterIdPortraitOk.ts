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
 * @interface GetCharactersCharacterIdPortraitOk
 */
export interface GetCharactersCharacterIdPortraitOk {
    /**
     * px128x128 string
     * @type {string}
     * @memberof GetCharactersCharacterIdPortraitOk
     */
    px128x128?: string;
    /**
     * px256x256 string
     * @type {string}
     * @memberof GetCharactersCharacterIdPortraitOk
     */
    px256x256?: string;
    /**
     * px512x512 string
     * @type {string}
     * @memberof GetCharactersCharacterIdPortraitOk
     */
    px512x512?: string;
    /**
     * px64x64 string
     * @type {string}
     * @memberof GetCharactersCharacterIdPortraitOk
     */
    px64x64?: string;
}

/**
 * Check if a given object implements the GetCharactersCharacterIdPortraitOk interface.
 */
export function instanceOfGetCharactersCharacterIdPortraitOk(value: object): value is GetCharactersCharacterIdPortraitOk {
    return true;
}

export function GetCharactersCharacterIdPortraitOkFromJSON(json: any): GetCharactersCharacterIdPortraitOk {
    return GetCharactersCharacterIdPortraitOkFromJSONTyped(json, false);
}

export function GetCharactersCharacterIdPortraitOkFromJSONTyped(json: any, ignoreDiscriminator: boolean): GetCharactersCharacterIdPortraitOk {
    if (json == null) {
        return json;
    }
    return {
        
        'px128x128': json['px128x128'] == null ? undefined : json['px128x128'],
        'px256x256': json['px256x256'] == null ? undefined : json['px256x256'],
        'px512x512': json['px512x512'] == null ? undefined : json['px512x512'],
        'px64x64': json['px64x64'] == null ? undefined : json['px64x64'],
    };
}

export function GetCharactersCharacterIdPortraitOkToJSON(json: any): GetCharactersCharacterIdPortraitOk {
    return GetCharactersCharacterIdPortraitOkToJSONTyped(json, false);
}

export function GetCharactersCharacterIdPortraitOkToJSONTyped(value?: GetCharactersCharacterIdPortraitOk | null, ignoreDiscriminator: boolean = false): any {
    if (value == null) {
        return value;
    }

    return {
        
        'px128x128': value['px128x128'],
        'px256x256': value['px256x256'],
        'px512x512': value['px512x512'],
        'px64x64': value['px64x64'],
    };
}

