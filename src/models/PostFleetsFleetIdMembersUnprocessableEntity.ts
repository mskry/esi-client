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
 * 422 unprocessable entity object
 * @export
 * @interface PostFleetsFleetIdMembersUnprocessableEntity
 */
export interface PostFleetsFleetIdMembersUnprocessableEntity {
    /**
     * error message
     * @type {string}
     * @memberof PostFleetsFleetIdMembersUnprocessableEntity
     */
    error?: string;
}

/**
 * Check if a given object implements the PostFleetsFleetIdMembersUnprocessableEntity interface.
 */
export function instanceOfPostFleetsFleetIdMembersUnprocessableEntity(value: object): value is PostFleetsFleetIdMembersUnprocessableEntity {
    return true;
}

export function PostFleetsFleetIdMembersUnprocessableEntityFromJSON(json: any): PostFleetsFleetIdMembersUnprocessableEntity {
    return PostFleetsFleetIdMembersUnprocessableEntityFromJSONTyped(json, false);
}

export function PostFleetsFleetIdMembersUnprocessableEntityFromJSONTyped(json: any, ignoreDiscriminator: boolean): PostFleetsFleetIdMembersUnprocessableEntity {
    if (json == null) {
        return json;
    }
    return {
        
        'error': json['error'] == null ? undefined : json['error'],
    };
}

export function PostFleetsFleetIdMembersUnprocessableEntityToJSON(json: any): PostFleetsFleetIdMembersUnprocessableEntity {
    return PostFleetsFleetIdMembersUnprocessableEntityToJSONTyped(json, false);
}

export function PostFleetsFleetIdMembersUnprocessableEntityToJSONTyped(value?: PostFleetsFleetIdMembersUnprocessableEntity | null, ignoreDiscriminator: boolean = false): any {
    if (value == null) {
        return value;
    }

    return {
        
        'error': value['error'],
    };
}
