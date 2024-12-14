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


import * as runtime from '../runtime';
import type {
  BadRequest,
  ErrorLimited,
  GatewayTimeout,
  GetWarsWarIdKillmails200Ok,
  GetWarsWarIdKillmailsUnprocessableEntity,
  GetWarsWarIdOk,
  GetWarsWarIdUnprocessableEntity,
  InternalServerError,
  ServiceUnavailable,
} from '../models/index';
import {
    BadRequestFromJSON,
    BadRequestToJSON,
    ErrorLimitedFromJSON,
    ErrorLimitedToJSON,
    GatewayTimeoutFromJSON,
    GatewayTimeoutToJSON,
    GetWarsWarIdKillmails200OkFromJSON,
    GetWarsWarIdKillmails200OkToJSON,
    GetWarsWarIdKillmailsUnprocessableEntityFromJSON,
    GetWarsWarIdKillmailsUnprocessableEntityToJSON,
    GetWarsWarIdOkFromJSON,
    GetWarsWarIdOkToJSON,
    GetWarsWarIdUnprocessableEntityFromJSON,
    GetWarsWarIdUnprocessableEntityToJSON,
    InternalServerErrorFromJSON,
    InternalServerErrorToJSON,
    ServiceUnavailableFromJSON,
    ServiceUnavailableToJSON,
} from '../models/index';

export interface GetWarsRequest {
    datasource?: GetWarsDatasourceEnum;
    ifNoneMatch?: string;
    maxWarId?: number;
}

export interface GetWarsWarIdRequest {
    warId: number;
    datasource?: GetWarsWarIdDatasourceEnum;
    ifNoneMatch?: string;
}

export interface GetWarsWarIdKillmailsRequest {
    warId: number;
    datasource?: GetWarsWarIdKillmailsDatasourceEnum;
    ifNoneMatch?: string;
    page?: number;
}

/**
 * 
 */
export class WarsApi extends runtime.BaseAPI {

    /**
     * Return a list of wars  ---  This route is cached for up to 3600 seconds
     * List wars
     */
    async getWarsRaw(requestParameters: GetWarsRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<runtime.ApiResponse<Array<number>>> {
        const queryParameters: any = {};

        if (requestParameters['datasource'] != null) {
            queryParameters['datasource'] = requestParameters['datasource'];
        }

        if (requestParameters['maxWarId'] != null) {
            queryParameters['max_war_id'] = requestParameters['maxWarId'];
        }

        const headerParameters: runtime.HTTPHeaders = {};

        if (requestParameters['ifNoneMatch'] != null) {
            headerParameters['If-None-Match'] = String(requestParameters['ifNoneMatch']);
        }

        const response = await this.request({
            path: `/v1/wars/`,
            method: 'GET',
            headers: headerParameters,
            query: queryParameters,
        }, initOverrides);

        return new runtime.JSONApiResponse<any>(response);
    }

    /**
     * Return a list of wars  ---  This route is cached for up to 3600 seconds
     * List wars
     */
    async getWars(requestParameters: GetWarsRequest = {}, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<Array<number>> {
        const response = await this.getWarsRaw(requestParameters, initOverrides);
        return await response.value();
    }

    /**
     * Return details about a war  ---  This route is cached for up to 3600 seconds
     * Get war information
     */
    async getWarsWarIdRaw(requestParameters: GetWarsWarIdRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<runtime.ApiResponse<GetWarsWarIdOk>> {
        if (requestParameters['warId'] == null) {
            throw new runtime.RequiredError(
                'warId',
                'Required parameter "warId" was null or undefined when calling getWarsWarId().'
            );
        }

        const queryParameters: any = {};

        if (requestParameters['datasource'] != null) {
            queryParameters['datasource'] = requestParameters['datasource'];
        }

        const headerParameters: runtime.HTTPHeaders = {};

        if (requestParameters['ifNoneMatch'] != null) {
            headerParameters['If-None-Match'] = String(requestParameters['ifNoneMatch']);
        }

        const response = await this.request({
            path: `/v1/wars/{war_id}/`.replace(`{${"war_id"}}`, encodeURIComponent(String(requestParameters['warId']))),
            method: 'GET',
            headers: headerParameters,
            query: queryParameters,
        }, initOverrides);

        return new runtime.JSONApiResponse(response, (jsonValue) => GetWarsWarIdOkFromJSON(jsonValue));
    }

    /**
     * Return details about a war  ---  This route is cached for up to 3600 seconds
     * Get war information
     */
    async getWarsWarId(requestParameters: GetWarsWarIdRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<GetWarsWarIdOk> {
        const response = await this.getWarsWarIdRaw(requestParameters, initOverrides);
        return await response.value();
    }

    /**
     * Return a list of kills related to a war  ---  This route is cached for up to 3600 seconds
     * List kills for a war
     */
    async getWarsWarIdKillmailsRaw(requestParameters: GetWarsWarIdKillmailsRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<runtime.ApiResponse<Array<GetWarsWarIdKillmails200Ok>>> {
        if (requestParameters['warId'] == null) {
            throw new runtime.RequiredError(
                'warId',
                'Required parameter "warId" was null or undefined when calling getWarsWarIdKillmails().'
            );
        }

        const queryParameters: any = {};

        if (requestParameters['datasource'] != null) {
            queryParameters['datasource'] = requestParameters['datasource'];
        }

        if (requestParameters['page'] != null) {
            queryParameters['page'] = requestParameters['page'];
        }

        const headerParameters: runtime.HTTPHeaders = {};

        if (requestParameters['ifNoneMatch'] != null) {
            headerParameters['If-None-Match'] = String(requestParameters['ifNoneMatch']);
        }

        const response = await this.request({
            path: `/v1/wars/{war_id}/killmails/`.replace(`{${"war_id"}}`, encodeURIComponent(String(requestParameters['warId']))),
            method: 'GET',
            headers: headerParameters,
            query: queryParameters,
        }, initOverrides);

        return new runtime.JSONApiResponse(response, (jsonValue) => jsonValue.map(GetWarsWarIdKillmails200OkFromJSON));
    }

    /**
     * Return a list of kills related to a war  ---  This route is cached for up to 3600 seconds
     * List kills for a war
     */
    async getWarsWarIdKillmails(requestParameters: GetWarsWarIdKillmailsRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<Array<GetWarsWarIdKillmails200Ok>> {
        const response = await this.getWarsWarIdKillmailsRaw(requestParameters, initOverrides);
        return await response.value();
    }

}

/**
 * @export
 */
export const GetWarsDatasourceEnum = {
    Tranquility: 'tranquility'
} as const;
export type GetWarsDatasourceEnum = typeof GetWarsDatasourceEnum[keyof typeof GetWarsDatasourceEnum];
/**
 * @export
 */
export const GetWarsWarIdDatasourceEnum = {
    Tranquility: 'tranquility'
} as const;
export type GetWarsWarIdDatasourceEnum = typeof GetWarsWarIdDatasourceEnum[keyof typeof GetWarsWarIdDatasourceEnum];
/**
 * @export
 */
export const GetWarsWarIdKillmailsDatasourceEnum = {
    Tranquility: 'tranquility'
} as const;
export type GetWarsWarIdKillmailsDatasourceEnum = typeof GetWarsWarIdKillmailsDatasourceEnum[keyof typeof GetWarsWarIdKillmailsDatasourceEnum];
