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
 * @interface GetFleetsFleetIdMembers200Ok
 */
export interface GetFleetsFleetIdMembers200Ok {
    /**
     * character_id integer
     * @type {number}
     * @memberof GetFleetsFleetIdMembers200Ok
     */
    characterId: number;
    /**
     * join_time string
     * @type {Date}
     * @memberof GetFleetsFleetIdMembers200Ok
     */
    joinTime: Date;
    /**
     * Member’s role in fleet
     * @type {string}
     * @memberof GetFleetsFleetIdMembers200Ok
     */
    role: GetFleetsFleetIdMembers200OkRoleEnum;
    /**
     * Localized role names
     * @type {string}
     * @memberof GetFleetsFleetIdMembers200Ok
     */
    roleName: string;
    /**
     * ship_type_id integer
     * @type {number}
     * @memberof GetFleetsFleetIdMembers200Ok
     */
    shipTypeId: number;
    /**
     * Solar system the member is located in
     * @type {number}
     * @memberof GetFleetsFleetIdMembers200Ok
     */
    solarSystemId: number;
    /**
     * ID of the squad the member is in. If not applicable, will be set to -1
     * @type {number}
     * @memberof GetFleetsFleetIdMembers200Ok
     */
    squadId: number;
    /**
     * Station in which the member is docked in, if applicable
     * @type {number}
     * @memberof GetFleetsFleetIdMembers200Ok
     */
    stationId?: number;
    /**
     * Whether the member take fleet warps
     * @type {boolean}
     * @memberof GetFleetsFleetIdMembers200Ok
     */
    takesFleetWarp: boolean;
    /**
     * ID of the wing the member is in. If not applicable, will be set to -1
     * @type {number}
     * @memberof GetFleetsFleetIdMembers200Ok
     */
    wingId: number;
}


/**
 * @export
 */
export const GetFleetsFleetIdMembers200OkRoleEnum = {
    FleetCommander: 'fleet_commander',
    WingCommander: 'wing_commander',
    SquadCommander: 'squad_commander',
    SquadMember: 'squad_member'
} as const;
export type GetFleetsFleetIdMembers200OkRoleEnum = typeof GetFleetsFleetIdMembers200OkRoleEnum[keyof typeof GetFleetsFleetIdMembers200OkRoleEnum];


/**
 * Check if a given object implements the GetFleetsFleetIdMembers200Ok interface.
 */
export function instanceOfGetFleetsFleetIdMembers200Ok(value: object): value is GetFleetsFleetIdMembers200Ok {
    if (!('characterId' in value) || value['characterId'] === undefined) return false;
    if (!('joinTime' in value) || value['joinTime'] === undefined) return false;
    if (!('role' in value) || value['role'] === undefined) return false;
    if (!('roleName' in value) || value['roleName'] === undefined) return false;
    if (!('shipTypeId' in value) || value['shipTypeId'] === undefined) return false;
    if (!('solarSystemId' in value) || value['solarSystemId'] === undefined) return false;
    if (!('squadId' in value) || value['squadId'] === undefined) return false;
    if (!('takesFleetWarp' in value) || value['takesFleetWarp'] === undefined) return false;
    if (!('wingId' in value) || value['wingId'] === undefined) return false;
    return true;
}

export function GetFleetsFleetIdMembers200OkFromJSON(json: any): GetFleetsFleetIdMembers200Ok {
    return GetFleetsFleetIdMembers200OkFromJSONTyped(json, false);
}

export function GetFleetsFleetIdMembers200OkFromJSONTyped(json: any, ignoreDiscriminator: boolean): GetFleetsFleetIdMembers200Ok {
    if (json == null) {
        return json;
    }
    return {
        
        'characterId': json['character_id'],
        'joinTime': (new Date(json['join_time'])),
        'role': json['role'],
        'roleName': json['role_name'],
        'shipTypeId': json['ship_type_id'],
        'solarSystemId': json['solar_system_id'],
        'squadId': json['squad_id'],
        'stationId': json['station_id'] == null ? undefined : json['station_id'],
        'takesFleetWarp': json['takes_fleet_warp'],
        'wingId': json['wing_id'],
    };
}

export function GetFleetsFleetIdMembers200OkToJSON(json: any): GetFleetsFleetIdMembers200Ok {
    return GetFleetsFleetIdMembers200OkToJSONTyped(json, false);
}

export function GetFleetsFleetIdMembers200OkToJSONTyped(value?: GetFleetsFleetIdMembers200Ok | null, ignoreDiscriminator: boolean = false): any {
    if (value == null) {
        return value;
    }

    return {
        
        'character_id': value['characterId'],
        'join_time': ((value['joinTime']).toISOString()),
        'role': value['role'],
        'role_name': value['roleName'],
        'ship_type_id': value['shipTypeId'],
        'solar_system_id': value['solarSystemId'],
        'squad_id': value['squadId'],
        'station_id': value['stationId'],
        'takes_fleet_warp': value['takesFleetWarp'],
        'wing_id': value['wingId'],
    };
}
