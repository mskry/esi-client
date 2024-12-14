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
 * @interface GetContractsPublicRegionId200Ok
 */
export interface GetContractsPublicRegionId200Ok {
    /**
     * Buyout price (for Auctions only)
     * @type {number}
     * @memberof GetContractsPublicRegionId200Ok
     */
    buyout?: number;
    /**
     * Collateral price (for Couriers only)
     * @type {number}
     * @memberof GetContractsPublicRegionId200Ok
     */
    collateral?: number;
    /**
     * contract_id integer
     * @type {number}
     * @memberof GetContractsPublicRegionId200Ok
     */
    contractId: number;
    /**
     * Expiration date of the contract
     * @type {Date}
     * @memberof GetContractsPublicRegionId200Ok
     */
    dateExpired: Date;
    /**
     * Сreation date of the contract
     * @type {Date}
     * @memberof GetContractsPublicRegionId200Ok
     */
    dateIssued: Date;
    /**
     * Number of days to perform the contract
     * @type {number}
     * @memberof GetContractsPublicRegionId200Ok
     */
    daysToComplete?: number;
    /**
     * End location ID (for Couriers contract)
     * @type {number}
     * @memberof GetContractsPublicRegionId200Ok
     */
    endLocationId?: number;
    /**
     * true if the contract was issued on behalf of the issuer's corporation
     * @type {boolean}
     * @memberof GetContractsPublicRegionId200Ok
     */
    forCorporation?: boolean;
    /**
     * Character's corporation ID for the issuer
     * @type {number}
     * @memberof GetContractsPublicRegionId200Ok
     */
    issuerCorporationId: number;
    /**
     * Character ID for the issuer
     * @type {number}
     * @memberof GetContractsPublicRegionId200Ok
     */
    issuerId: number;
    /**
     * Price of contract (for ItemsExchange and Auctions)
     * @type {number}
     * @memberof GetContractsPublicRegionId200Ok
     */
    price?: number;
    /**
     * Remuneration for contract (for Couriers only)
     * @type {number}
     * @memberof GetContractsPublicRegionId200Ok
     */
    reward?: number;
    /**
     * Start location ID (for Couriers contract)
     * @type {number}
     * @memberof GetContractsPublicRegionId200Ok
     */
    startLocationId?: number;
    /**
     * Title of the contract
     * @type {string}
     * @memberof GetContractsPublicRegionId200Ok
     */
    title?: string;
    /**
     * Type of the contract
     * @type {string}
     * @memberof GetContractsPublicRegionId200Ok
     */
    type: GetContractsPublicRegionId200OkTypeEnum;
    /**
     * Volume of items in the contract
     * @type {number}
     * @memberof GetContractsPublicRegionId200Ok
     */
    volume?: number;
}


/**
 * @export
 */
export const GetContractsPublicRegionId200OkTypeEnum = {
    Unknown: 'unknown',
    ItemExchange: 'item_exchange',
    Auction: 'auction',
    Courier: 'courier',
    Loan: 'loan'
} as const;
export type GetContractsPublicRegionId200OkTypeEnum = typeof GetContractsPublicRegionId200OkTypeEnum[keyof typeof GetContractsPublicRegionId200OkTypeEnum];


/**
 * Check if a given object implements the GetContractsPublicRegionId200Ok interface.
 */
export function instanceOfGetContractsPublicRegionId200Ok(value: object): value is GetContractsPublicRegionId200Ok {
    if (!('contractId' in value) || value['contractId'] === undefined) return false;
    if (!('dateExpired' in value) || value['dateExpired'] === undefined) return false;
    if (!('dateIssued' in value) || value['dateIssued'] === undefined) return false;
    if (!('issuerCorporationId' in value) || value['issuerCorporationId'] === undefined) return false;
    if (!('issuerId' in value) || value['issuerId'] === undefined) return false;
    if (!('type' in value) || value['type'] === undefined) return false;
    return true;
}

export function GetContractsPublicRegionId200OkFromJSON(json: any): GetContractsPublicRegionId200Ok {
    return GetContractsPublicRegionId200OkFromJSONTyped(json, false);
}

export function GetContractsPublicRegionId200OkFromJSONTyped(json: any, ignoreDiscriminator: boolean): GetContractsPublicRegionId200Ok {
    if (json == null) {
        return json;
    }
    return {
        
        'buyout': json['buyout'] == null ? undefined : json['buyout'],
        'collateral': json['collateral'] == null ? undefined : json['collateral'],
        'contractId': json['contract_id'],
        'dateExpired': (new Date(json['date_expired'])),
        'dateIssued': (new Date(json['date_issued'])),
        'daysToComplete': json['days_to_complete'] == null ? undefined : json['days_to_complete'],
        'endLocationId': json['end_location_id'] == null ? undefined : json['end_location_id'],
        'forCorporation': json['for_corporation'] == null ? undefined : json['for_corporation'],
        'issuerCorporationId': json['issuer_corporation_id'],
        'issuerId': json['issuer_id'],
        'price': json['price'] == null ? undefined : json['price'],
        'reward': json['reward'] == null ? undefined : json['reward'],
        'startLocationId': json['start_location_id'] == null ? undefined : json['start_location_id'],
        'title': json['title'] == null ? undefined : json['title'],
        'type': json['type'],
        'volume': json['volume'] == null ? undefined : json['volume'],
    };
}

export function GetContractsPublicRegionId200OkToJSON(json: any): GetContractsPublicRegionId200Ok {
    return GetContractsPublicRegionId200OkToJSONTyped(json, false);
}

export function GetContractsPublicRegionId200OkToJSONTyped(value?: GetContractsPublicRegionId200Ok | null, ignoreDiscriminator: boolean = false): any {
    if (value == null) {
        return value;
    }

    return {
        
        'buyout': value['buyout'],
        'collateral': value['collateral'],
        'contract_id': value['contractId'],
        'date_expired': ((value['dateExpired']).toISOString()),
        'date_issued': ((value['dateIssued']).toISOString()),
        'days_to_complete': value['daysToComplete'],
        'end_location_id': value['endLocationId'],
        'for_corporation': value['forCorporation'],
        'issuer_corporation_id': value['issuerCorporationId'],
        'issuer_id': value['issuerId'],
        'price': value['price'],
        'reward': value['reward'],
        'start_location_id': value['startLocationId'],
        'title': value['title'],
        'type': value['type'],
        'volume': value['volume'],
    };
}

