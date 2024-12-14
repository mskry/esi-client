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
 * @interface GetCharactersCharacterIdPlanets200Ok
 */
export interface GetCharactersCharacterIdPlanets200Ok {
    /**
     * last_update string
     * @type {Date}
     * @memberof GetCharactersCharacterIdPlanets200Ok
     */
    lastUpdate: Date;
    /**
     * num_pins integer
     * @type {number}
     * @memberof GetCharactersCharacterIdPlanets200Ok
     */
    numPins: number;
    /**
     * owner_id integer
     * @type {number}
     * @memberof GetCharactersCharacterIdPlanets200Ok
     */
    ownerId: number;
    /**
     * planet_id integer
     * @type {number}
     * @memberof GetCharactersCharacterIdPlanets200Ok
     */
    planetId: number;
    /**
     * planet_type string
     * @type {string}
     * @memberof GetCharactersCharacterIdPlanets200Ok
     */
    planetType: GetCharactersCharacterIdPlanets200OkPlanetTypeEnum;
    /**
     * solar_system_id integer
     * @type {number}
     * @memberof GetCharactersCharacterIdPlanets200Ok
     */
    solarSystemId: number;
    /**
     * upgrade_level integer
     * @type {number}
     * @memberof GetCharactersCharacterIdPlanets200Ok
     */
    upgradeLevel: number;
}


/**
 * @export
 */
export const GetCharactersCharacterIdPlanets200OkPlanetTypeEnum = {
    Temperate: 'temperate',
    Barren: 'barren',
    Oceanic: 'oceanic',
    Ice: 'ice',
    Gas: 'gas',
    Lava: 'lava',
    Storm: 'storm',
    Plasma: 'plasma'
} as const;
export type GetCharactersCharacterIdPlanets200OkPlanetTypeEnum = typeof GetCharactersCharacterIdPlanets200OkPlanetTypeEnum[keyof typeof GetCharactersCharacterIdPlanets200OkPlanetTypeEnum];


/**
 * Check if a given object implements the GetCharactersCharacterIdPlanets200Ok interface.
 */
export function instanceOfGetCharactersCharacterIdPlanets200Ok(value: object): value is GetCharactersCharacterIdPlanets200Ok {
    if (!('lastUpdate' in value) || value['lastUpdate'] === undefined) return false;
    if (!('numPins' in value) || value['numPins'] === undefined) return false;
    if (!('ownerId' in value) || value['ownerId'] === undefined) return false;
    if (!('planetId' in value) || value['planetId'] === undefined) return false;
    if (!('planetType' in value) || value['planetType'] === undefined) return false;
    if (!('solarSystemId' in value) || value['solarSystemId'] === undefined) return false;
    if (!('upgradeLevel' in value) || value['upgradeLevel'] === undefined) return false;
    return true;
}

export function GetCharactersCharacterIdPlanets200OkFromJSON(json: any): GetCharactersCharacterIdPlanets200Ok {
    return GetCharactersCharacterIdPlanets200OkFromJSONTyped(json, false);
}

export function GetCharactersCharacterIdPlanets200OkFromJSONTyped(json: any, ignoreDiscriminator: boolean): GetCharactersCharacterIdPlanets200Ok {
    if (json == null) {
        return json;
    }
    return {
        
        'lastUpdate': (new Date(json['last_update'])),
        'numPins': json['num_pins'],
        'ownerId': json['owner_id'],
        'planetId': json['planet_id'],
        'planetType': json['planet_type'],
        'solarSystemId': json['solar_system_id'],
        'upgradeLevel': json['upgrade_level'],
    };
}

export function GetCharactersCharacterIdPlanets200OkToJSON(json: any): GetCharactersCharacterIdPlanets200Ok {
    return GetCharactersCharacterIdPlanets200OkToJSONTyped(json, false);
}

export function GetCharactersCharacterIdPlanets200OkToJSONTyped(value?: GetCharactersCharacterIdPlanets200Ok | null, ignoreDiscriminator: boolean = false): any {
    if (value == null) {
        return value;
    }

    return {
        
        'last_update': ((value['lastUpdate']).toISOString()),
        'num_pins': value['numPins'],
        'owner_id': value['ownerId'],
        'planet_id': value['planetId'],
        'planet_type': value['planetType'],
        'solar_system_id': value['solarSystemId'],
        'upgrade_level': value['upgradeLevel'],
    };
}

