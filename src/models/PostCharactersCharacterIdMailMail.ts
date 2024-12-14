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
import type { PostCharactersCharacterIdMailRecipient } from './PostCharactersCharacterIdMailRecipient';
import {
    PostCharactersCharacterIdMailRecipientFromJSON,
    PostCharactersCharacterIdMailRecipientFromJSONTyped,
    PostCharactersCharacterIdMailRecipientToJSON,
    PostCharactersCharacterIdMailRecipientToJSONTyped,
} from './PostCharactersCharacterIdMailRecipient';

/**
 * mail object
 * @export
 * @interface PostCharactersCharacterIdMailMail
 */
export interface PostCharactersCharacterIdMailMail {
    /**
     * approved_cost integer
     * @type {number}
     * @memberof PostCharactersCharacterIdMailMail
     */
    approvedCost?: number;
    /**
     * body string
     * @type {string}
     * @memberof PostCharactersCharacterIdMailMail
     */
    body: string;
    /**
     * recipients array
     * @type {Array<PostCharactersCharacterIdMailRecipient>}
     * @memberof PostCharactersCharacterIdMailMail
     */
    recipients: Array<PostCharactersCharacterIdMailRecipient>;
    /**
     * subject string
     * @type {string}
     * @memberof PostCharactersCharacterIdMailMail
     */
    subject: string;
}

/**
 * Check if a given object implements the PostCharactersCharacterIdMailMail interface.
 */
export function instanceOfPostCharactersCharacterIdMailMail(value: object): value is PostCharactersCharacterIdMailMail {
    if (!('body' in value) || value['body'] === undefined) return false;
    if (!('recipients' in value) || value['recipients'] === undefined) return false;
    if (!('subject' in value) || value['subject'] === undefined) return false;
    return true;
}

export function PostCharactersCharacterIdMailMailFromJSON(json: any): PostCharactersCharacterIdMailMail {
    return PostCharactersCharacterIdMailMailFromJSONTyped(json, false);
}

export function PostCharactersCharacterIdMailMailFromJSONTyped(json: any, ignoreDiscriminator: boolean): PostCharactersCharacterIdMailMail {
    if (json == null) {
        return json;
    }
    return {
        
        'approvedCost': json['approved_cost'] == null ? undefined : json['approved_cost'],
        'body': json['body'],
        'recipients': ((json['recipients'] as Array<any>).map(PostCharactersCharacterIdMailRecipientFromJSON)),
        'subject': json['subject'],
    };
}

export function PostCharactersCharacterIdMailMailToJSON(json: any): PostCharactersCharacterIdMailMail {
    return PostCharactersCharacterIdMailMailToJSONTyped(json, false);
}

export function PostCharactersCharacterIdMailMailToJSONTyped(value?: PostCharactersCharacterIdMailMail | null, ignoreDiscriminator: boolean = false): any {
    if (value == null) {
        return value;
    }

    return {
        
        'approved_cost': value['approvedCost'],
        'body': value['body'],
        'recipients': ((value['recipients'] as Array<any>).map(PostCharactersCharacterIdMailRecipientToJSON)),
        'subject': value['subject'],
    };
}
