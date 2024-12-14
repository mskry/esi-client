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
 * factory_details object
 * @export
 * @interface GetCharactersCharacterIdPlanetsPlanetIdFactoryDetails
 */
export interface GetCharactersCharacterIdPlanetsPlanetIdFactoryDetails {
    /**
     * schematic_id integer
     * @type {number}
     * @memberof GetCharactersCharacterIdPlanetsPlanetIdFactoryDetails
     */
    schematicId: number;
}

/**
 * Check if a given object implements the GetCharactersCharacterIdPlanetsPlanetIdFactoryDetails interface.
 */
export function instanceOfGetCharactersCharacterIdPlanetsPlanetIdFactoryDetails(value: object): value is GetCharactersCharacterIdPlanetsPlanetIdFactoryDetails {
    if (!('schematicId' in value) || value['schematicId'] === undefined) return false;
    return true;
}

export function GetCharactersCharacterIdPlanetsPlanetIdFactoryDetailsFromJSON(json: any): GetCharactersCharacterIdPlanetsPlanetIdFactoryDetails {
    return GetCharactersCharacterIdPlanetsPlanetIdFactoryDetailsFromJSONTyped(json, false);
}

export function GetCharactersCharacterIdPlanetsPlanetIdFactoryDetailsFromJSONTyped(json: any, ignoreDiscriminator: boolean): GetCharactersCharacterIdPlanetsPlanetIdFactoryDetails {
    if (json == null) {
        return json;
    }
    return {
        
        'schematicId': json['schematic_id'],
    };
}

export function GetCharactersCharacterIdPlanetsPlanetIdFactoryDetailsToJSON(json: any): GetCharactersCharacterIdPlanetsPlanetIdFactoryDetails {
    return GetCharactersCharacterIdPlanetsPlanetIdFactoryDetailsToJSONTyped(json, false);
}

export function GetCharactersCharacterIdPlanetsPlanetIdFactoryDetailsToJSONTyped(value?: GetCharactersCharacterIdPlanetsPlanetIdFactoryDetails | null, ignoreDiscriminator: boolean = false): any {
    if (value == null) {
        return value;
    }

    return {
        
        'schematic_id': value['schematicId'],
    };
}
