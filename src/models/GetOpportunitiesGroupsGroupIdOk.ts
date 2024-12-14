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
 * @interface GetOpportunitiesGroupsGroupIdOk
 */
export interface GetOpportunitiesGroupsGroupIdOk {
    /**
     * The groups that are connected to this group on the opportunities map
     * @type {Array<number>}
     * @memberof GetOpportunitiesGroupsGroupIdOk
     */
    connectedGroups: Array<number>;
    /**
     * description string
     * @type {string}
     * @memberof GetOpportunitiesGroupsGroupIdOk
     */
    description: string;
    /**
     * group_id integer
     * @type {number}
     * @memberof GetOpportunitiesGroupsGroupIdOk
     */
    groupId: number;
    /**
     * name string
     * @type {string}
     * @memberof GetOpportunitiesGroupsGroupIdOk
     */
    name: string;
    /**
     * notification string
     * @type {string}
     * @memberof GetOpportunitiesGroupsGroupIdOk
     */
    notification: string;
    /**
     * Tasks need to complete for this group
     * @type {Array<number>}
     * @memberof GetOpportunitiesGroupsGroupIdOk
     */
    requiredTasks: Array<number>;
}

/**
 * Check if a given object implements the GetOpportunitiesGroupsGroupIdOk interface.
 */
export function instanceOfGetOpportunitiesGroupsGroupIdOk(value: object): value is GetOpportunitiesGroupsGroupIdOk {
    if (!('connectedGroups' in value) || value['connectedGroups'] === undefined) return false;
    if (!('description' in value) || value['description'] === undefined) return false;
    if (!('groupId' in value) || value['groupId'] === undefined) return false;
    if (!('name' in value) || value['name'] === undefined) return false;
    if (!('notification' in value) || value['notification'] === undefined) return false;
    if (!('requiredTasks' in value) || value['requiredTasks'] === undefined) return false;
    return true;
}

export function GetOpportunitiesGroupsGroupIdOkFromJSON(json: any): GetOpportunitiesGroupsGroupIdOk {
    return GetOpportunitiesGroupsGroupIdOkFromJSONTyped(json, false);
}

export function GetOpportunitiesGroupsGroupIdOkFromJSONTyped(json: any, ignoreDiscriminator: boolean): GetOpportunitiesGroupsGroupIdOk {
    if (json == null) {
        return json;
    }
    return {
        
        'connectedGroups': json['connected_groups'],
        'description': json['description'],
        'groupId': json['group_id'],
        'name': json['name'],
        'notification': json['notification'],
        'requiredTasks': json['required_tasks'],
    };
}

export function GetOpportunitiesGroupsGroupIdOkToJSON(json: any): GetOpportunitiesGroupsGroupIdOk {
    return GetOpportunitiesGroupsGroupIdOkToJSONTyped(json, false);
}

export function GetOpportunitiesGroupsGroupIdOkToJSONTyped(value?: GetOpportunitiesGroupsGroupIdOk | null, ignoreDiscriminator: boolean = false): any {
    if (value == null) {
        return value;
    }

    return {
        
        'connected_groups': value['connectedGroups'],
        'description': value['description'],
        'group_id': value['groupId'],
        'name': value['name'],
        'notification': value['notification'],
        'required_tasks': value['requiredTasks'],
    };
}
