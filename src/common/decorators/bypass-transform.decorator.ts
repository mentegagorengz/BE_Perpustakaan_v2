import { SetMetadata } from '@nestjs/common';

export const BYPASS_TRANSFORM_KEY = 'bypass_transform';

/**
 * Kecualikan route dari transform envelope global (API_STANDARDS.md §5.3).
 * Dipakai untuk OAuth/token endpoint, file download/blob, atau SSE/streaming.
 */
export const BypassTransform = () => SetMetadata(BYPASS_TRANSFORM_KEY, true);
