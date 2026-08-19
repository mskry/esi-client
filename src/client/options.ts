export type EsiLanguage = 'de' | 'en' | 'es' | 'fr' | 'ja' | 'ko' | 'ru' | 'zh';
export type EsiTokenProvider = () => Promise<string>;
export type EsiFetch = typeof globalThis.fetch;

export interface EsiClientOptions {
  readonly baseUrl?: string;
  readonly compatibilityDate?: string;
  readonly language?: EsiLanguage;
  readonly token?: string;
  readonly tokenProvider?: EsiTokenProvider;
  readonly fetch?: EsiFetch;
  readonly validateResponses?: boolean;
  readonly validateRequests?: boolean;
  readonly allowGenericMutations?: boolean;
}

export interface SerializedEsiClientConfiguration {
  readonly baseUrl: string;
  readonly compatibilityDate: string;
  readonly language: EsiLanguage;
  readonly validateResponses: boolean;
  readonly validateRequests: boolean;
  readonly allowGenericMutations: boolean;
}
