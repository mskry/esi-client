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
 * attacker object
 * @export
 * @interface GetKillmailsKillmailIdKillmailHashAttacker
 */
export interface GetKillmailsKillmailIdKillmailHashAttacker {
    /**
     * alliance_id integer
     * @type {number}
     * @memberof GetKillmailsKillmailIdKillmailHashAttacker
     */
    allianceId?: number;
    /**
     * character_id integer
     * @type {number}
     * @memberof GetKillmailsKillmailIdKillmailHashAttacker
     */
    characterId?: number;
    /**
     * corporation_id integer
     * @type {number}
     * @memberof GetKillmailsKillmailIdKillmailHashAttacker
     */
    corporationId?: number;
    /**
     * damage_done integer
     * @type {number}
     * @memberof GetKillmailsKillmailIdKillmailHashAttacker
     */
    damageDone: number;
    /**
     * faction_id integer
     * @type {number}
     * @memberof GetKillmailsKillmailIdKillmailHashAttacker
     */
    factionId?: number;
    /**
     * Was the attacker the one to achieve the final blow
     * 
     * @type {boolean}
     * @memberof GetKillmailsKillmailIdKillmailHashAttacker
     */
    finalBlow: boolean;
    /**
     * Security status for the attacker
     * 
     * @type {number}
     * @memberof GetKillmailsKillmailIdKillmailHashAttacker
     */
    securityStatus: number;
    /**
     * What ship was the attacker flying
     * 
     * @type {number}
     * @memberof GetKillmailsKillmailIdKillmailHashAttacker
     */
    shipTypeId?: number;
    /**
     * What weapon was used by the attacker for the kill
     * 
     * @type {number}
     * @memberof GetKillmailsKillmailIdKillmailHashAttacker
     */
    weaponTypeId?: number;
}

/**
 * Check if a given object implements the GetKillmailsKillmailIdKillmailHashAttacker interface.
 */
export function instanceOfGetKillmailsKillmailIdKillmailHashAttacker(value: object): value is GetKillmailsKillmailIdKillmailHashAttacker {
    if (!('damageDone' in value) || value['damageDone'] === undefined) return false;
    if (!('finalBlow' in value) || value['finalBlow'] === undefined) return false;
    if (!('securityStatus' in value) || value['securityStatus'] === undefined) return false;
    return true;
}

export function GetKillmailsKillmailIdKillmailHashAttackerFromJSON(json: any): GetKillmailsKillmailIdKillmailHashAttacker {
    return GetKillmailsKillmailIdKillmailHashAttackerFromJSONTyped(json, false);
}

export function GetKillmailsKillmailIdKillmailHashAttackerFromJSONTyped(json: any, ignoreDiscriminator: boolean): GetKillmailsKillmailIdKillmailHashAttacker {
    if (json == null) {
        return json;
    }
    return {
        
        'allianceId': json['alliance_id'] == null ? undefined : json['alliance_id'],
        'characterId': json['character_id'] == null ? undefined : json['character_id'],
        'corporationId': json['corporation_id'] == null ? undefined : json['corporation_id'],
        'damageDone': json['damage_done'],
        'factionId': json['faction_id'] == null ? undefined : json['faction_id'],
        'finalBlow': json['final_blow'],
        'securityStatus': json['security_status'],
        'shipTypeId': json['ship_type_id'] == null ? undefined : json['ship_type_id'],
        'weaponTypeId': json['weapon_type_id'] == null ? undefined : json['weapon_type_id'],
    };
}

export function GetKillmailsKillmailIdKillmailHashAttackerToJSON(json: any): GetKillmailsKillmailIdKillmailHashAttacker {
    return GetKillmailsKillmailIdKillmailHashAttackerToJSONTyped(json, false);
}

export function GetKillmailsKillmailIdKillmailHashAttackerToJSONTyped(value?: GetKillmailsKillmailIdKillmailHashAttacker | null, ignoreDiscriminator: boolean = false): any {
    if (value == null) {
        return value;
    }

    return {
        
        'alliance_id': value['allianceId'],
        'character_id': value['characterId'],
        'corporation_id': value['corporationId'],
        'damage_done': value['damageDone'],
        'faction_id': value['factionId'],
        'final_blow': value['finalBlow'],
        'security_status': value['securityStatus'],
        'ship_type_id': value['shipTypeId'],
        'weapon_type_id': value['weaponTypeId'],
    };
}

