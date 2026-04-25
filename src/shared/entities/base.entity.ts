/**
 * Base entity class with common properties for all domain entities
 */
export abstract class BaseEntity {
  id!: string;
  createdAt!: Date;
  updatedAt!: Date;

  constructor() {
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  /**
   * Updates the updatedAt timestamp
   */
  touch(): void {
    this.updatedAt = new Date();
  }
}
