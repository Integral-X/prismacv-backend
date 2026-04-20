/**
 * Base mapper interface for consistent DTO-Entity conversions
 */
export interface IMapper<TDto, TEntity> {
  toEntity(dto: TDto): TEntity;
  toDto(entity: TEntity): TDto;
  toEntityArray(dtos: TDto[]): TEntity[];
  toDtoArray(entities: TEntity[]): TDto[];
}

/**
 * Abstract base mapper class providing common functionality
 */
export abstract class BaseMapper<TDto, TEntity> implements IMapper<
  TDto,
  TEntity
> {
  /**
   * Convert DTO to Entity - must be implemented by concrete mappers
   */
  abstract toEntity(dto: TDto): TEntity;

  /**
   * Convert Entity to DTO - must be implemented by concrete mappers
   */
  abstract toDto(entity: TEntity): TDto;

  /**
   * Convert array of DTOs to array of Entities
   */
  toEntityArray(dtos: TDto[]): TEntity[] {
    if (!dtos || !Array.isArray(dtos)) {
      return [];
    }
    return dtos.map(dto => this.toEntity(dto));
  }

  /**
   * Convert array of Entities to array of DTOs
   */
  toDtoArray(entities: TEntity[]): TDto[] {
    if (!entities || !Array.isArray(entities)) {
      return [];
    }
    return entities.map(entity => this.toDto(entity));
  }

  /**
   * Safely handle null/undefined values in conversions
   */
  protected handleNullValue<T>(
    value: T | null | undefined,
    defaultValue: T,
  ): T {
    return value ?? defaultValue;
  }

  /**
   * Safely trim string values
   */
  protected safeTrim(value: string | null | undefined): string | undefined {
    return value?.trim() || undefined;
  }

  /**
   * Safely convert string to lowercase
   */
  protected safeLowerCase(
    value: string | null | undefined,
  ): string | undefined {
    return value?.toLowerCase().trim() || undefined;
  }
}
