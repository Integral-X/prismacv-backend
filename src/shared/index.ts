/**
 * Shared module exports for the DTO-Entity-Mapper pattern
 */

// Base classes
export { BaseEntity } from './entities/base.entity';
export { IMapper, BaseMapper } from './mappers/base.mapper';

// Types and interfaces
export * from './types/mapper.types';

// Utilities
export * from './utils/uuid.util';

// Existing exports
export * from './dto/pagination.dto';
export * from './interfaces/api-response.interface';
