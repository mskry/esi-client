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
 * wallet transaction
 * @export
 * @interface GetCorporationsCorporationIdWalletsDivisionTransactions200Ok
 */
export interface GetCorporationsCorporationIdWalletsDivisionTransactions200Ok {
    /**
     * client_id integer
     * @type {number}
     * @memberof GetCorporationsCorporationIdWalletsDivisionTransactions200Ok
     */
    clientId: number;
    /**
     * Date and time of transaction
     * @type {Date}
     * @memberof GetCorporationsCorporationIdWalletsDivisionTransactions200Ok
     */
    date: Date;
    /**
     * is_buy boolean
     * @type {boolean}
     * @memberof GetCorporationsCorporationIdWalletsDivisionTransactions200Ok
     */
    isBuy: boolean;
    /**
     * -1 if there is no corresponding wallet journal entry
     * @type {number}
     * @memberof GetCorporationsCorporationIdWalletsDivisionTransactions200Ok
     */
    journalRefId: number;
    /**
     * location_id integer
     * @type {number}
     * @memberof GetCorporationsCorporationIdWalletsDivisionTransactions200Ok
     */
    locationId: number;
    /**
     * quantity integer
     * @type {number}
     * @memberof GetCorporationsCorporationIdWalletsDivisionTransactions200Ok
     */
    quantity: number;
    /**
     * Unique transaction ID
     * @type {number}
     * @memberof GetCorporationsCorporationIdWalletsDivisionTransactions200Ok
     */
    transactionId: number;
    /**
     * type_id integer
     * @type {number}
     * @memberof GetCorporationsCorporationIdWalletsDivisionTransactions200Ok
     */
    typeId: number;
    /**
     * Amount paid per unit
     * @type {number}
     * @memberof GetCorporationsCorporationIdWalletsDivisionTransactions200Ok
     */
    unitPrice: number;
}

/**
 * Check if a given object implements the GetCorporationsCorporationIdWalletsDivisionTransactions200Ok interface.
 */
export function instanceOfGetCorporationsCorporationIdWalletsDivisionTransactions200Ok(value: object): value is GetCorporationsCorporationIdWalletsDivisionTransactions200Ok {
    if (!('clientId' in value) || value['clientId'] === undefined) return false;
    if (!('date' in value) || value['date'] === undefined) return false;
    if (!('isBuy' in value) || value['isBuy'] === undefined) return false;
    if (!('journalRefId' in value) || value['journalRefId'] === undefined) return false;
    if (!('locationId' in value) || value['locationId'] === undefined) return false;
    if (!('quantity' in value) || value['quantity'] === undefined) return false;
    if (!('transactionId' in value) || value['transactionId'] === undefined) return false;
    if (!('typeId' in value) || value['typeId'] === undefined) return false;
    if (!('unitPrice' in value) || value['unitPrice'] === undefined) return false;
    return true;
}

export function GetCorporationsCorporationIdWalletsDivisionTransactions200OkFromJSON(json: any): GetCorporationsCorporationIdWalletsDivisionTransactions200Ok {
    return GetCorporationsCorporationIdWalletsDivisionTransactions200OkFromJSONTyped(json, false);
}

export function GetCorporationsCorporationIdWalletsDivisionTransactions200OkFromJSONTyped(json: any, ignoreDiscriminator: boolean): GetCorporationsCorporationIdWalletsDivisionTransactions200Ok {
    if (json == null) {
        return json;
    }
    return {
        
        'clientId': json['client_id'],
        'date': (new Date(json['date'])),
        'isBuy': json['is_buy'],
        'journalRefId': json['journal_ref_id'],
        'locationId': json['location_id'],
        'quantity': json['quantity'],
        'transactionId': json['transaction_id'],
        'typeId': json['type_id'],
        'unitPrice': json['unit_price'],
    };
}

export function GetCorporationsCorporationIdWalletsDivisionTransactions200OkToJSON(json: any): GetCorporationsCorporationIdWalletsDivisionTransactions200Ok {
    return GetCorporationsCorporationIdWalletsDivisionTransactions200OkToJSONTyped(json, false);
}

export function GetCorporationsCorporationIdWalletsDivisionTransactions200OkToJSONTyped(value?: GetCorporationsCorporationIdWalletsDivisionTransactions200Ok | null, ignoreDiscriminator: boolean = false): any {
    if (value == null) {
        return value;
    }

    return {
        
        'client_id': value['clientId'],
        'date': ((value['date']).toISOString()),
        'is_buy': value['isBuy'],
        'journal_ref_id': value['journalRefId'],
        'location_id': value['locationId'],
        'quantity': value['quantity'],
        'transaction_id': value['transactionId'],
        'type_id': value['typeId'],
        'unit_price': value['unitPrice'],
    };
}

