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
 * @interface GetUniverseGraphicsGraphicIdOk
 */
export interface GetUniverseGraphicsGraphicIdOk {
    /**
     * collision_file string
     * @type {string}
     * @memberof GetUniverseGraphicsGraphicIdOk
     */
    collisionFile?: string;
    /**
     * graphic_file string
     * @type {string}
     * @memberof GetUniverseGraphicsGraphicIdOk
     */
    graphicFile?: string;
    /**
     * graphic_id integer
     * @type {number}
     * @memberof GetUniverseGraphicsGraphicIdOk
     */
    graphicId: number;
    /**
     * icon_folder string
     * @type {string}
     * @memberof GetUniverseGraphicsGraphicIdOk
     */
    iconFolder?: string;
    /**
     * sof_dna string
     * @type {string}
     * @memberof GetUniverseGraphicsGraphicIdOk
     */
    sofDna?: string;
    /**
     * sof_fation_name string
     * @type {string}
     * @memberof GetUniverseGraphicsGraphicIdOk
     */
    sofFationName?: string;
    /**
     * sof_hull_name string
     * @type {string}
     * @memberof GetUniverseGraphicsGraphicIdOk
     */
    sofHullName?: string;
    /**
     * sof_race_name string
     * @type {string}
     * @memberof GetUniverseGraphicsGraphicIdOk
     */
    sofRaceName?: string;
}

/**
 * Check if a given object implements the GetUniverseGraphicsGraphicIdOk interface.
 */
export function instanceOfGetUniverseGraphicsGraphicIdOk(value: object): value is GetUniverseGraphicsGraphicIdOk {
    if (!('graphicId' in value) || value['graphicId'] === undefined) return false;
    return true;
}

export function GetUniverseGraphicsGraphicIdOkFromJSON(json: any): GetUniverseGraphicsGraphicIdOk {
    return GetUniverseGraphicsGraphicIdOkFromJSONTyped(json, false);
}

export function GetUniverseGraphicsGraphicIdOkFromJSONTyped(json: any, ignoreDiscriminator: boolean): GetUniverseGraphicsGraphicIdOk {
    if (json == null) {
        return json;
    }
    return {
        
        'collisionFile': json['collision_file'] == null ? undefined : json['collision_file'],
        'graphicFile': json['graphic_file'] == null ? undefined : json['graphic_file'],
        'graphicId': json['graphic_id'],
        'iconFolder': json['icon_folder'] == null ? undefined : json['icon_folder'],
        'sofDna': json['sof_dna'] == null ? undefined : json['sof_dna'],
        'sofFationName': json['sof_fation_name'] == null ? undefined : json['sof_fation_name'],
        'sofHullName': json['sof_hull_name'] == null ? undefined : json['sof_hull_name'],
        'sofRaceName': json['sof_race_name'] == null ? undefined : json['sof_race_name'],
    };
}

export function GetUniverseGraphicsGraphicIdOkToJSON(json: any): GetUniverseGraphicsGraphicIdOk {
    return GetUniverseGraphicsGraphicIdOkToJSONTyped(json, false);
}

export function GetUniverseGraphicsGraphicIdOkToJSONTyped(value?: GetUniverseGraphicsGraphicIdOk | null, ignoreDiscriminator: boolean = false): any {
    if (value == null) {
        return value;
    }

    return {
        
        'collision_file': value['collisionFile'],
        'graphic_file': value['graphicFile'],
        'graphic_id': value['graphicId'],
        'icon_folder': value['iconFolder'],
        'sof_dna': value['sofDna'],
        'sof_fation_name': value['sofFationName'],
        'sof_hull_name': value['sofHullName'],
        'sof_race_name': value['sofRaceName'],
    };
}
