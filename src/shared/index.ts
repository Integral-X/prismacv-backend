/**
 * Shared module exports for the DTO-Entity-Mapper pattern
 */

// Base classes
export { BaseEntity } from './entities/base.entity';

// DTOs
export { PaginationQueryDto, SortOrder } from './dto/pagination-query.dto';
export {
  PaginatedResponseDto,
  PaginationMeta,
} from './dto/paginated-response.dto';

// Utilities
export * from './utils/uuid.util';

// Existing exports
export * from './interfaces/api-response.interface';
