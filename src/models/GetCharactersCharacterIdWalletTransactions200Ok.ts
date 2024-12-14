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
 * @interface GetCharactersCharacterIdWalletTransactions200Ok
 */
export interface GetCharactersCharacterIdWalletTransactions200Ok {
    /**
     * client_id integer
     * @type {number}
     * @memberof GetCharactersCharacterIdWalletTransactions200Ok
     */
    clientId: number;
    /**
     * Date and time of transaction
     * @type {Date}
     * @memberof GetCharactersCharacterIdWalletTransactions200Ok
     */
    date: Date;
    /**
     * is_buy boolean
     * @type {boolean}
     * @memberof GetCharactersCharacterIdWalletTransactions200Ok
     */
    isBuy: boolean;
    /**
     * is_personal boolean
     * @type {boolean}
     * @memberof GetCharactersCharacterIdWalletTransactions200Ok
     */
    isPersonal: boolean;
    /**
     * journal_ref_id integer
     * @type {number}
     * @memberof GetCharactersCharacterIdWalletTransactions200Ok
     */
    journalRefId: number;
    /**
     * location_id integer
     * @type {number}
     * @memberof GetCharactersCharacterIdWalletTransactions200Ok
     */
    locationId: number;
    /**
     * quantity integer
     * @type {number}
     * @memberof GetCharactersCharacterIdWalletTransactions200Ok
     */
    quantity: number;
    /**
     * Unique transaction ID
     * @type {number}
     * @memberof GetCharactersCharacterIdWalletTransactions200Ok
     */
    transactionId: number;
    /**
     * type_id integer
     * @type {number}
     * @memberof GetCharactersCharacterIdWalletTransactions200Ok
     */
    typeId: number;
    /**
     * Amount paid per unit
     * @type {number}
     * @memberof GetCharactersCharacterIdWalletTransactions200Ok
     */
    unitPrice: number;
}

/**
 * Check if a given object implements the GetCharactersCharacterIdWalletTransactions200Ok interface.
 */
export function instanceOfGetCharactersCharacterIdWalletTransactions200Ok(value: object): value is GetCharactersCharacterIdWalletTransactions200Ok {
    if (!('clientId' in value) || value['clientId'] === undefined) return false;
    if (!('date' in value) || value['date'] === undefined) return false;
    if (!('isBuy' in value) || value['isBuy'] === undefined) return false;
    if (!('isPersonal' in value) || value['isPersonal'] === undefined) return false;
    if (!('journalRefId' in value) || value['journalRefId'] === undefined) return false;
    if (!('locationId' in value) || value['locationId'] === undefined) return false;
    if (!('quantity' in value) || value['quantity'] === undefined) return false;
    if (!('transactionId' in value) || value['transactionId'] === undefined) return false;
    if (!('typeId' in value) || value['typeId'] === undefined) return false;
    if (!('unitPrice' in value) || value['unitPrice'] === undefined) return false;
    return true;
}

export function GetCharactersCharacterIdWalletTransactions200OkFromJSON(json: any): GetCharactersCharacterIdWalletTransactions200Ok {
    return GetCharactersCharacterIdWalletTransactions200OkFromJSONTyped(json, false);
}

export function GetCharactersCharacterIdWalletTransactions200OkFromJSONTyped(json: any, ignoreDiscriminator: boolean): GetCharactersCharacterIdWalletTransactions200Ok {
    if (json == null) {
        return json;
    }
    return {
        
        'clientId': json['client_id'],
        'date': (new Date(json['date'])),
        'isBuy': json['is_buy'],
        'isPersonal': json['is_personal'],
        'journalRefId': json['journal_ref_id'],
        'locationId': json['location_id'],
        'quantity': json['quantity'],
        'transactionId': json['transaction_id'],
        'typeId': json['type_id'],
        'unitPrice': json['unit_price'],
    };
}

export function GetCharactersCharacterIdWalletTransactions200OkToJSON(json: any): GetCharactersCharacterIdWalletTransactions200Ok {
    return GetCharactersCharacterIdWalletTransactions200OkToJSONTyped(json, false);
}

export function GetCharactersCharacterIdWalletTransactions200OkToJSONTyped(value?: GetCharactersCharacterIdWalletTransactions200Ok | null, ignoreDiscriminator: boolean = false): any {
    if (value == null) {
        return value;
    }

    return {
        
        'client_id': value['clientId'],
        'date': ((value['date']).toISOString()),
        'is_buy': value['isBuy'],
        'is_personal': value['isPersonal'],
        'journal_ref_id': value['journalRefId'],
        'location_id': value['locationId'],
        'quantity': value['quantity'],
        'transaction_id': value['transactionId'],
        'type_id': value['typeId'],
        'unit_price': value['unitPrice'],
    };
}
