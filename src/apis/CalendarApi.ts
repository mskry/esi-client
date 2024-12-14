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
  Forbidden,
  GatewayTimeout,
  GetCharactersCharacterIdCalendar200Ok,
  GetCharactersCharacterIdCalendarEventIdAttendees200Ok,
  GetCharactersCharacterIdCalendarEventIdAttendeesNotFound,
  GetCharactersCharacterIdCalendarEventIdNotFound,
  GetCharactersCharacterIdCalendarEventIdOk,
  InternalServerError,
  PutCharactersCharacterIdCalendarEventIdResponse,
  ServiceUnavailable,
  Unauthorized,
} from '../models/index';
import {
    BadRequestFromJSON,
    BadRequestToJSON,
    ErrorLimitedFromJSON,
    ErrorLimitedToJSON,
    ForbiddenFromJSON,
    ForbiddenToJSON,
    GatewayTimeoutFromJSON,
    GatewayTimeoutToJSON,
    GetCharactersCharacterIdCalendar200OkFromJSON,
    GetCharactersCharacterIdCalendar200OkToJSON,
    GetCharactersCharacterIdCalendarEventIdAttendees200OkFromJSON,
    GetCharactersCharacterIdCalendarEventIdAttendees200OkToJSON,
    GetCharactersCharacterIdCalendarEventIdAttendeesNotFoundFromJSON,
    GetCharactersCharacterIdCalendarEventIdAttendeesNotFoundToJSON,
    GetCharactersCharacterIdCalendarEventIdNotFoundFromJSON,
    GetCharactersCharacterIdCalendarEventIdNotFoundToJSON,
    GetCharactersCharacterIdCalendarEventIdOkFromJSON,
    GetCharactersCharacterIdCalendarEventIdOkToJSON,
    InternalServerErrorFromJSON,
    InternalServerErrorToJSON,
    PutCharactersCharacterIdCalendarEventIdResponseFromJSON,
    PutCharactersCharacterIdCalendarEventIdResponseToJSON,
    ServiceUnavailableFromJSON,
    ServiceUnavailableToJSON,
    UnauthorizedFromJSON,
    UnauthorizedToJSON,
} from '../models/index';

export interface GetCharactersCharacterIdCalendarRequest {
    characterId: number;
    datasource?: GetCharactersCharacterIdCalendarDatasourceEnum;
    fromEvent?: number;
    ifNoneMatch?: string;
    token?: string;
}

export interface GetCharactersCharacterIdCalendarEventIdRequest {
    characterId: number;
    eventId: number;
    datasource?: GetCharactersCharacterIdCalendarEventIdDatasourceEnum;
    ifNoneMatch?: string;
    token?: string;
}

export interface GetCharactersCharacterIdCalendarEventIdAttendeesRequest {
    characterId: number;
    eventId: number;
    datasource?: GetCharactersCharacterIdCalendarEventIdAttendeesDatasourceEnum;
    ifNoneMatch?: string;
    token?: string;
}

export interface PutCharactersCharacterIdCalendarEventIdRequest {
    characterId: number;
    eventId: number;
    response: PutCharactersCharacterIdCalendarEventIdResponse;
    datasource?: PutCharactersCharacterIdCalendarEventIdDatasourceEnum;
    token?: string;
}

/**
 * 
 */
export class CalendarApi extends runtime.BaseAPI {

    /**
     * Get 50 event summaries from the calendar. If no from_event ID is given, the resource will return the next 50 chronological event summaries from now. If a from_event ID is specified, it will return the next 50 chronological event summaries from after that event  ---  This route is cached for up to 5 seconds
     * List calendar event summaries
     */
    async getCharactersCharacterIdCalendarRaw(requestParameters: GetCharactersCharacterIdCalendarRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<runtime.ApiResponse<Array<GetCharactersCharacterIdCalendar200Ok>>> {
        if (requestParameters['characterId'] == null) {
            throw new runtime.RequiredError(
                'characterId',
                'Required parameter "characterId" was null or undefined when calling getCharactersCharacterIdCalendar().'
            );
        }

        const queryParameters: any = {};

        if (requestParameters['datasource'] != null) {
            queryParameters['datasource'] = requestParameters['datasource'];
        }

        if (requestParameters['fromEvent'] != null) {
            queryParameters['from_event'] = requestParameters['fromEvent'];
        }

        if (requestParameters['token'] != null) {
            queryParameters['token'] = requestParameters['token'];
        }

        const headerParameters: runtime.HTTPHeaders = {};

        if (requestParameters['ifNoneMatch'] != null) {
            headerParameters['If-None-Match'] = String(requestParameters['ifNoneMatch']);
        }

        if (this.configuration && this.configuration.accessToken) {
            // oauth required
            headerParameters["Authorization"] = await this.configuration.accessToken("evesso", ["esi-calendar.read_calendar_events.v1"]);
        }

        const response = await this.request({
            path: `/v1/characters/{character_id}/calendar/`.replace(`{${"character_id"}}`, encodeURIComponent(String(requestParameters['characterId']))),
            method: 'GET',
            headers: headerParameters,
            query: queryParameters,
        }, initOverrides);

        return new runtime.JSONApiResponse(response, (jsonValue) => jsonValue.map(GetCharactersCharacterIdCalendar200OkFromJSON));
    }

    /**
     * Get 50 event summaries from the calendar. If no from_event ID is given, the resource will return the next 50 chronological event summaries from now. If a from_event ID is specified, it will return the next 50 chronological event summaries from after that event  ---  This route is cached for up to 5 seconds
     * List calendar event summaries
     */
    async getCharactersCharacterIdCalendar(requestParameters: GetCharactersCharacterIdCalendarRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<Array<GetCharactersCharacterIdCalendar200Ok>> {
        const response = await this.getCharactersCharacterIdCalendarRaw(requestParameters, initOverrides);
        return await response.value();
    }

    /**
     * Get all the information for a specific event  ---  This route is cached for up to 5 seconds
     * Get an event
     */
    async getCharactersCharacterIdCalendarEventIdRaw(requestParameters: GetCharactersCharacterIdCalendarEventIdRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<runtime.ApiResponse<GetCharactersCharacterIdCalendarEventIdOk>> {
        if (requestParameters['characterId'] == null) {
            throw new runtime.RequiredError(
                'characterId',
                'Required parameter "characterId" was null or undefined when calling getCharactersCharacterIdCalendarEventId().'
            );
        }

        if (requestParameters['eventId'] == null) {
            throw new runtime.RequiredError(
                'eventId',
                'Required parameter "eventId" was null or undefined when calling getCharactersCharacterIdCalendarEventId().'
            );
        }

        const queryParameters: any = {};

        if (requestParameters['datasource'] != null) {
            queryParameters['datasource'] = requestParameters['datasource'];
        }

        if (requestParameters['token'] != null) {
            queryParameters['token'] = requestParameters['token'];
        }

        const headerParameters: runtime.HTTPHeaders = {};

        if (requestParameters['ifNoneMatch'] != null) {
            headerParameters['If-None-Match'] = String(requestParameters['ifNoneMatch']);
        }

        if (this.configuration && this.configuration.accessToken) {
            // oauth required
            headerParameters["Authorization"] = await this.configuration.accessToken("evesso", ["esi-calendar.read_calendar_events.v1"]);
        }

        const response = await this.request({
            path: `/v3/characters/{character_id}/calendar/{event_id}/`.replace(`{${"character_id"}}`, encodeURIComponent(String(requestParameters['characterId']))).replace(`{${"event_id"}}`, encodeURIComponent(String(requestParameters['eventId']))),
            method: 'GET',
            headers: headerParameters,
            query: queryParameters,
        }, initOverrides);

        return new runtime.JSONApiResponse(response, (jsonValue) => GetCharactersCharacterIdCalendarEventIdOkFromJSON(jsonValue));
    }

    /**
     * Get all the information for a specific event  ---  This route is cached for up to 5 seconds
     * Get an event
     */
    async getCharactersCharacterIdCalendarEventId(requestParameters: GetCharactersCharacterIdCalendarEventIdRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<GetCharactersCharacterIdCalendarEventIdOk> {
        const response = await this.getCharactersCharacterIdCalendarEventIdRaw(requestParameters, initOverrides);
        return await response.value();
    }

    /**
     * Get all invited attendees for a given event  ---  This route is cached for up to 600 seconds
     * Get attendees
     */
    async getCharactersCharacterIdCalendarEventIdAttendeesRaw(requestParameters: GetCharactersCharacterIdCalendarEventIdAttendeesRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<runtime.ApiResponse<Array<GetCharactersCharacterIdCalendarEventIdAttendees200Ok>>> {
        if (requestParameters['characterId'] == null) {
            throw new runtime.RequiredError(
                'characterId',
                'Required parameter "characterId" was null or undefined when calling getCharactersCharacterIdCalendarEventIdAttendees().'
            );
        }

        if (requestParameters['eventId'] == null) {
            throw new runtime.RequiredError(
                'eventId',
                'Required parameter "eventId" was null or undefined when calling getCharactersCharacterIdCalendarEventIdAttendees().'
            );
        }

        const queryParameters: any = {};

        if (requestParameters['datasource'] != null) {
            queryParameters['datasource'] = requestParameters['datasource'];
        }

        if (requestParameters['token'] != null) {
            queryParameters['token'] = requestParameters['token'];
        }

        const headerParameters: runtime.HTTPHeaders = {};

        if (requestParameters['ifNoneMatch'] != null) {
            headerParameters['If-None-Match'] = String(requestParameters['ifNoneMatch']);
        }

        if (this.configuration && this.configuration.accessToken) {
            // oauth required
            headerParameters["Authorization"] = await this.configuration.accessToken("evesso", ["esi-calendar.read_calendar_events.v1"]);
        }

        const response = await this.request({
            path: `/v1/characters/{character_id}/calendar/{event_id}/attendees/`.replace(`{${"character_id"}}`, encodeURIComponent(String(requestParameters['characterId']))).replace(`{${"event_id"}}`, encodeURIComponent(String(requestParameters['eventId']))),
            method: 'GET',
            headers: headerParameters,
            query: queryParameters,
        }, initOverrides);

        return new runtime.JSONApiResponse(response, (jsonValue) => jsonValue.map(GetCharactersCharacterIdCalendarEventIdAttendees200OkFromJSON));
    }

    /**
     * Get all invited attendees for a given event  ---  This route is cached for up to 600 seconds
     * Get attendees
     */
    async getCharactersCharacterIdCalendarEventIdAttendees(requestParameters: GetCharactersCharacterIdCalendarEventIdAttendeesRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<Array<GetCharactersCharacterIdCalendarEventIdAttendees200Ok>> {
        const response = await this.getCharactersCharacterIdCalendarEventIdAttendeesRaw(requestParameters, initOverrides);
        return await response.value();
    }

    /**
     * Set your response status to an event  ---  This route is cached for up to 5 seconds
     * Respond to an event
     */
    async putCharactersCharacterIdCalendarEventIdRaw(requestParameters: PutCharactersCharacterIdCalendarEventIdRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<runtime.ApiResponse<void>> {
        if (requestParameters['characterId'] == null) {
            throw new runtime.RequiredError(
                'characterId',
                'Required parameter "characterId" was null or undefined when calling putCharactersCharacterIdCalendarEventId().'
            );
        }

        if (requestParameters['eventId'] == null) {
            throw new runtime.RequiredError(
                'eventId',
                'Required parameter "eventId" was null or undefined when calling putCharactersCharacterIdCalendarEventId().'
            );
        }

        if (requestParameters['response'] == null) {
            throw new runtime.RequiredError(
                'response',
                'Required parameter "response" was null or undefined when calling putCharactersCharacterIdCalendarEventId().'
            );
        }

        const queryParameters: any = {};

        if (requestParameters['datasource'] != null) {
            queryParameters['datasource'] = requestParameters['datasource'];
        }

        if (requestParameters['token'] != null) {
            queryParameters['token'] = requestParameters['token'];
        }

        const headerParameters: runtime.HTTPHeaders = {};

        headerParameters['Content-Type'] = 'application/json';

        if (this.configuration && this.configuration.accessToken) {
            // oauth required
            headerParameters["Authorization"] = await this.configuration.accessToken("evesso", ["esi-calendar.respond_calendar_events.v1"]);
        }

        const response = await this.request({
            path: `/v3/characters/{character_id}/calendar/{event_id}/`.replace(`{${"character_id"}}`, encodeURIComponent(String(requestParameters['characterId']))).replace(`{${"event_id"}}`, encodeURIComponent(String(requestParameters['eventId']))),
            method: 'PUT',
            headers: headerParameters,
            query: queryParameters,
            body: PutCharactersCharacterIdCalendarEventIdResponseToJSON(requestParameters['response']),
        }, initOverrides);

        return new runtime.VoidApiResponse(response);
    }

    /**
     * Set your response status to an event  ---  This route is cached for up to 5 seconds
     * Respond to an event
     */
    async putCharactersCharacterIdCalendarEventId(requestParameters: PutCharactersCharacterIdCalendarEventIdRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<void> {
        await this.putCharactersCharacterIdCalendarEventIdRaw(requestParameters, initOverrides);
    }

}

/**
 * @export
 */
export const GetCharactersCharacterIdCalendarDatasourceEnum = {
    Tranquility: 'tranquility'
} as const;
export type GetCharactersCharacterIdCalendarDatasourceEnum = typeof GetCharactersCharacterIdCalendarDatasourceEnum[keyof typeof GetCharactersCharacterIdCalendarDatasourceEnum];
/**
 * @export
 */
export const GetCharactersCharacterIdCalendarEventIdDatasourceEnum = {
    Tranquility: 'tranquility'
} as const;
export type GetCharactersCharacterIdCalendarEventIdDatasourceEnum = typeof GetCharactersCharacterIdCalendarEventIdDatasourceEnum[keyof typeof GetCharactersCharacterIdCalendarEventIdDatasourceEnum];
/**
 * @export
 */
export const GetCharactersCharacterIdCalendarEventIdAttendeesDatasourceEnum = {
    Tranquility: 'tranquility'
} as const;
export type GetCharactersCharacterIdCalendarEventIdAttendeesDatasourceEnum = typeof GetCharactersCharacterIdCalendarEventIdAttendeesDatasourceEnum[keyof typeof GetCharactersCharacterIdCalendarEventIdAttendeesDatasourceEnum];
/**
 * @export
 */
export const PutCharactersCharacterIdCalendarEventIdDatasourceEnum = {
    Tranquility: 'tranquility'
} as const;
export type PutCharactersCharacterIdCalendarEventIdDatasourceEnum = typeof PutCharactersCharacterIdCalendarEventIdDatasourceEnum[keyof typeof PutCharactersCharacterIdCalendarEventIdDatasourceEnum];
