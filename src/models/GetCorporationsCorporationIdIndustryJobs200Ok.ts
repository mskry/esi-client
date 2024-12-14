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
 * @interface GetCorporationsCorporationIdIndustryJobs200Ok
 */
export interface GetCorporationsCorporationIdIndustryJobs200Ok {
    /**
     * Job activity ID
     * @type {number}
     * @memberof GetCorporationsCorporationIdIndustryJobs200Ok
     */
    activityId: number;
    /**
     * blueprint_id integer
     * @type {number}
     * @memberof GetCorporationsCorporationIdIndustryJobs200Ok
     */
    blueprintId: number;
    /**
     * Location ID of the location from which the blueprint was installed. Normally a station ID, but can also be an asset (e.g. container) or corporation facility
     * @type {number}
     * @memberof GetCorporationsCorporationIdIndustryJobs200Ok
     */
    blueprintLocationId: number;
    /**
     * blueprint_type_id integer
     * @type {number}
     * @memberof GetCorporationsCorporationIdIndustryJobs200Ok
     */
    blueprintTypeId: number;
    /**
     * ID of the character which completed this job
     * @type {number}
     * @memberof GetCorporationsCorporationIdIndustryJobs200Ok
     */
    completedCharacterId?: number;
    /**
     * Date and time when this job was completed
     * @type {Date}
     * @memberof GetCorporationsCorporationIdIndustryJobs200Ok
     */
    completedDate?: Date;
    /**
     * The sume of job installation fee and industry facility tax
     * @type {number}
     * @memberof GetCorporationsCorporationIdIndustryJobs200Ok
     */
    cost?: number;
    /**
     * Job duration in seconds
     * @type {number}
     * @memberof GetCorporationsCorporationIdIndustryJobs200Ok
     */
    duration: number;
    /**
     * Date and time when this job finished
     * @type {Date}
     * @memberof GetCorporationsCorporationIdIndustryJobs200Ok
     */
    endDate: Date;
    /**
     * ID of the facility where this job is running
     * @type {number}
     * @memberof GetCorporationsCorporationIdIndustryJobs200Ok
     */
    facilityId: number;
    /**
     * ID of the character which installed this job
     * @type {number}
     * @memberof GetCorporationsCorporationIdIndustryJobs200Ok
     */
    installerId: number;
    /**
     * Unique job ID
     * @type {number}
     * @memberof GetCorporationsCorporationIdIndustryJobs200Ok
     */
    jobId: number;
    /**
     * Number of runs blueprint is licensed for
     * @type {number}
     * @memberof GetCorporationsCorporationIdIndustryJobs200Ok
     */
    licensedRuns?: number;
    /**
     * ID of the location for the industry facility
     * @type {number}
     * @memberof GetCorporationsCorporationIdIndustryJobs200Ok
     */
    locationId: number;
    /**
     * Location ID of the location to which the output of the job will be delivered. Normally a station ID, but can also be a corporation facility
     * @type {number}
     * @memberof GetCorporationsCorporationIdIndustryJobs200Ok
     */
    outputLocationId: number;
    /**
     * Date and time when this job was paused (i.e. time when the facility where this job was installed went offline)
     * @type {Date}
     * @memberof GetCorporationsCorporationIdIndustryJobs200Ok
     */
    pauseDate?: Date;
    /**
     * Chance of success for invention
     * @type {number}
     * @memberof GetCorporationsCorporationIdIndustryJobs200Ok
     */
    probability?: number;
    /**
     * Type ID of product (manufactured, copied or invented)
     * @type {number}
     * @memberof GetCorporationsCorporationIdIndustryJobs200Ok
     */
    productTypeId?: number;
    /**
     * Number of runs for a manufacturing job, or number of copies to make for a blueprint copy
     * @type {number}
     * @memberof GetCorporationsCorporationIdIndustryJobs200Ok
     */
    runs: number;
    /**
     * Date and time when this job started
     * @type {Date}
     * @memberof GetCorporationsCorporationIdIndustryJobs200Ok
     */
    startDate: Date;
    /**
     * status string
     * @type {string}
     * @memberof GetCorporationsCorporationIdIndustryJobs200Ok
     */
    status: GetCorporationsCorporationIdIndustryJobs200OkStatusEnum;
    /**
     * Number of successful runs for this job. Equal to runs unless this is an invention job
     * @type {number}
     * @memberof GetCorporationsCorporationIdIndustryJobs200Ok
     */
    successfulRuns?: number;
}


/**
 * @export
 */
export const GetCorporationsCorporationIdIndustryJobs200OkStatusEnum = {
    Active: 'active',
    Cancelled: 'cancelled',
    Delivered: 'delivered',
    Paused: 'paused',
    Ready: 'ready',
    Reverted: 'reverted'
} as const;
export type GetCorporationsCorporationIdIndustryJobs200OkStatusEnum = typeof GetCorporationsCorporationIdIndustryJobs200OkStatusEnum[keyof typeof GetCorporationsCorporationIdIndustryJobs200OkStatusEnum];


/**
 * Check if a given object implements the GetCorporationsCorporationIdIndustryJobs200Ok interface.
 */
export function instanceOfGetCorporationsCorporationIdIndustryJobs200Ok(value: object): value is GetCorporationsCorporationIdIndustryJobs200Ok {
    if (!('activityId' in value) || value['activityId'] === undefined) return false;
    if (!('blueprintId' in value) || value['blueprintId'] === undefined) return false;
    if (!('blueprintLocationId' in value) || value['blueprintLocationId'] === undefined) return false;
    if (!('blueprintTypeId' in value) || value['blueprintTypeId'] === undefined) return false;
    if (!('duration' in value) || value['duration'] === undefined) return false;
    if (!('endDate' in value) || value['endDate'] === undefined) return false;
    if (!('facilityId' in value) || value['facilityId'] === undefined) return false;
    if (!('installerId' in value) || value['installerId'] === undefined) return false;
    if (!('jobId' in value) || value['jobId'] === undefined) return false;
    if (!('locationId' in value) || value['locationId'] === undefined) return false;
    if (!('outputLocationId' in value) || value['outputLocationId'] === undefined) return false;
    if (!('runs' in value) || value['runs'] === undefined) return false;
    if (!('startDate' in value) || value['startDate'] === undefined) return false;
    if (!('status' in value) || value['status'] === undefined) return false;
    return true;
}

export function GetCorporationsCorporationIdIndustryJobs200OkFromJSON(json: any): GetCorporationsCorporationIdIndustryJobs200Ok {
    return GetCorporationsCorporationIdIndustryJobs200OkFromJSONTyped(json, false);
}

export function GetCorporationsCorporationIdIndustryJobs200OkFromJSONTyped(json: any, ignoreDiscriminator: boolean): GetCorporationsCorporationIdIndustryJobs200Ok {
    if (json == null) {
        return json;
    }
    return {
        
        'activityId': json['activity_id'],
        'blueprintId': json['blueprint_id'],
        'blueprintLocationId': json['blueprint_location_id'],
        'blueprintTypeId': json['blueprint_type_id'],
        'completedCharacterId': json['completed_character_id'] == null ? undefined : json['completed_character_id'],
        'completedDate': json['completed_date'] == null ? undefined : (new Date(json['completed_date'])),
        'cost': json['cost'] == null ? undefined : json['cost'],
        'duration': json['duration'],
        'endDate': (new Date(json['end_date'])),
        'facilityId': json['facility_id'],
        'installerId': json['installer_id'],
        'jobId': json['job_id'],
        'licensedRuns': json['licensed_runs'] == null ? undefined : json['licensed_runs'],
        'locationId': json['location_id'],
        'outputLocationId': json['output_location_id'],
        'pauseDate': json['pause_date'] == null ? undefined : (new Date(json['pause_date'])),
        'probability': json['probability'] == null ? undefined : json['probability'],
        'productTypeId': json['product_type_id'] == null ? undefined : json['product_type_id'],
        'runs': json['runs'],
        'startDate': (new Date(json['start_date'])),
        'status': json['status'],
        'successfulRuns': json['successful_runs'] == null ? undefined : json['successful_runs'],
    };
}

export function GetCorporationsCorporationIdIndustryJobs200OkToJSON(json: any): GetCorporationsCorporationIdIndustryJobs200Ok {
    return GetCorporationsCorporationIdIndustryJobs200OkToJSONTyped(json, false);
}

export function GetCorporationsCorporationIdIndustryJobs200OkToJSONTyped(value?: GetCorporationsCorporationIdIndustryJobs200Ok | null, ignoreDiscriminator: boolean = false): any {
    if (value == null) {
        return value;
    }

    return {
        
        'activity_id': value['activityId'],
        'blueprint_id': value['blueprintId'],
        'blueprint_location_id': value['blueprintLocationId'],
        'blueprint_type_id': value['blueprintTypeId'],
        'completed_character_id': value['completedCharacterId'],
        'completed_date': value['completedDate'] == null ? undefined : ((value['completedDate']).toISOString()),
        'cost': value['cost'],
        'duration': value['duration'],
        'end_date': ((value['endDate']).toISOString()),
        'facility_id': value['facilityId'],
        'installer_id': value['installerId'],
        'job_id': value['jobId'],
        'licensed_runs': value['licensedRuns'],
        'location_id': value['locationId'],
        'output_location_id': value['outputLocationId'],
        'pause_date': value['pauseDate'] == null ? undefined : ((value['pauseDate']).toISOString()),
        'probability': value['probability'],
        'product_type_id': value['productTypeId'],
        'runs': value['runs'],
        'start_date': ((value['startDate']).toISOString()),
        'status': value['status'],
        'successful_runs': value['successfulRuns'],
    };
}
