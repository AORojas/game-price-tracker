export type MetadataProviderErrorCode =
  | 'NOT_CONFIGURED'
  | 'INVALID_QUERY'
  | 'INVALID_FILTER'
  | 'TIMEOUT'
  | 'CONNECTION'
  | 'HTTP_ERROR'
  | 'RATE_LIMITED'
  | 'INVALID_RESPONSE'

export class MetadataProviderError extends Error {
  constructor(
    message: string,
    public readonly code: MetadataProviderErrorCode,
    public readonly statusCode?: number,
    options?: ErrorOptions,
  ) {
    super(message, options)
    this.name = 'MetadataProviderError'
  }
}
