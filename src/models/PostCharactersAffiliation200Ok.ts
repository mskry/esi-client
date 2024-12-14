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
 * @interface PostCharactersAffiliation200Ok
 */
export interface PostCharactersAffiliation200Ok {
    /**
     * The character's alliance ID, if their corporation is in an alliance
     * @type {number}
     * @memberof PostCharactersAffiliation200Ok
     */
    allianceId?: number;
    /**
     * The character's ID
     * @type {number}
     * @memberof PostCharactersAffiliation200Ok
     */
    characterId: number;
    /**
     * The character's corporation ID
     * @type {number}
     * @memberof PostCharactersAffiliation200Ok
     */
    corporationId: number;
    /**
     * The character's faction ID, if their corporation is in a faction
     * @type {number}
     * @memberof PostCharactersAffiliation200Ok
     */
    factionId?: number;
}

/**
 * Check if a given object implements the PostCharactersAffiliation200Ok interface.
 */
export function instanceOfPostCharactersAffiliation200Ok(value: object): value is PostCharactersAffiliation200Ok {
    if (!('characterId' in value) || value['characterId'] === undefined) return false;
    if (!('corporationId' in value) || value['corporationId'] === undefined) return false;
    return true;
}

export function PostCharactersAffiliation200OkFromJSON(json: any): PostCharactersAffiliation200Ok {
    return PostCharactersAffiliation200OkFromJSONTyped(json, false);
}

export function PostCharactersAffiliation200OkFromJSONTyped(json: any, ignoreDiscriminator: boolean): PostCharactersAffiliation200Ok {
    if (json == null) {
        return json;
    }
    return {
        
        'allianceId': json['alliance_id'] == null ? undefined : json['alliance_id'],
        'characterId': json['character_id'],
        'corporationId': json['corporation_id'],
        'factionId': json['faction_id'] == null ? undefined : json['faction_id'],
    };
}

export function PostCharactersAffiliation200OkToJSON(json: any): PostCharactersAffiliation200Ok {
    return PostCharactersAffiliation200OkToJSONTyped(json, false);
}

export function PostCharactersAffiliation200OkToJSONTyped(value?: PostCharactersAffiliation200Ok | null, ignoreDiscriminator: boolean = false): any {
    if (value == null) {
        return value;
    }

    return {
        
        'alliance_id': value['allianceId'],
        'character_id': value['characterId'],
        'corporation_id': value['corporationId'],
        'faction_id': value['factionId'],
    };
}

