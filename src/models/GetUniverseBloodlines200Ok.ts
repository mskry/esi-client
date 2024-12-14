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
 * @interface GetUniverseBloodlines200Ok
 */
export interface GetUniverseBloodlines200Ok {
    /**
     * bloodline_id integer
     * @type {number}
     * @memberof GetUniverseBloodlines200Ok
     */
    bloodlineId: number;
    /**
     * charisma integer
     * @type {number}
     * @memberof GetUniverseBloodlines200Ok
     */
    charisma: number;
    /**
     * corporation_id integer
     * @type {number}
     * @memberof GetUniverseBloodlines200Ok
     */
    corporationId: number;
    /**
     * description string
     * @type {string}
     * @memberof GetUniverseBloodlines200Ok
     */
    description: string;
    /**
     * intelligence integer
     * @type {number}
     * @memberof GetUniverseBloodlines200Ok
     */
    intelligence: number;
    /**
     * memory integer
     * @type {number}
     * @memberof GetUniverseBloodlines200Ok
     */
    memory: number;
    /**
     * name string
     * @type {string}
     * @memberof GetUniverseBloodlines200Ok
     */
    name: string;
    /**
     * perception integer
     * @type {number}
     * @memberof GetUniverseBloodlines200Ok
     */
    perception: number;
    /**
     * race_id integer
     * @type {number}
     * @memberof GetUniverseBloodlines200Ok
     */
    raceId: number;
    /**
     * ship_type_id integer
     * @type {number}
     * @memberof GetUniverseBloodlines200Ok
     */
    shipTypeId: number | null;
    /**
     * willpower integer
     * @type {number}
     * @memberof GetUniverseBloodlines200Ok
     */
    willpower: number;
}

/**
 * Check if a given object implements the GetUniverseBloodlines200Ok interface.
 */
export function instanceOfGetUniverseBloodlines200Ok(value: object): value is GetUniverseBloodlines200Ok {
    if (!('bloodlineId' in value) || value['bloodlineId'] === undefined) return false;
    if (!('charisma' in value) || value['charisma'] === undefined) return false;
    if (!('corporationId' in value) || value['corporationId'] === undefined) return false;
    if (!('description' in value) || value['description'] === undefined) return false;
    if (!('intelligence' in value) || value['intelligence'] === undefined) return false;
    if (!('memory' in value) || value['memory'] === undefined) return false;
    if (!('name' in value) || value['name'] === undefined) return false;
    if (!('perception' in value) || value['perception'] === undefined) return false;
    if (!('raceId' in value) || value['raceId'] === undefined) return false;
    if (!('shipTypeId' in value) || value['shipTypeId'] === undefined) return false;
    if (!('willpower' in value) || value['willpower'] === undefined) return false;
    return true;
}

export function GetUniverseBloodlines200OkFromJSON(json: any): GetUniverseBloodlines200Ok {
    return GetUniverseBloodlines200OkFromJSONTyped(json, false);
}

export function GetUniverseBloodlines200OkFromJSONTyped(json: any, ignoreDiscriminator: boolean): GetUniverseBloodlines200Ok {
    if (json == null) {
        return json;
    }
    return {
        
        'bloodlineId': json['bloodline_id'],
        'charisma': json['charisma'],
        'corporationId': json['corporation_id'],
        'description': json['description'],
        'intelligence': json['intelligence'],
        'memory': json['memory'],
        'name': json['name'],
        'perception': json['perception'],
        'raceId': json['race_id'],
        'shipTypeId': json['ship_type_id'],
        'willpower': json['willpower'],
    };
}

export function GetUniverseBloodlines200OkToJSON(json: any): GetUniverseBloodlines200Ok {
    return GetUniverseBloodlines200OkToJSONTyped(json, false);
}

export function GetUniverseBloodlines200OkToJSONTyped(value?: GetUniverseBloodlines200Ok | null, ignoreDiscriminator: boolean = false): any {
    if (value == null) {
        return value;
    }

    return {
        
        'bloodline_id': value['bloodlineId'],
        'charisma': value['charisma'],
        'corporation_id': value['corporationId'],
        'description': value['description'],
        'intelligence': value['intelligence'],
        'memory': value['memory'],
        'name': value['name'],
        'perception': value['perception'],
        'race_id': value['raceId'],
        'ship_type_id': value['shipTypeId'],
        'willpower': value['willpower'],
    };
}

