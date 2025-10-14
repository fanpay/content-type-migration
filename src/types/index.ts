// Types for Content Type Migration Custom App

export interface ContentTypeInfo {
  id: string;
  name: string;
  codename: string;
  elements: ElementInfo[];
}

export interface ElementInfo {
  id: string;
  name: string;
  codename: string;
  type: string;
  guidelines?: string;
  isRequired: boolean;
  options?: any[];
}

export interface FieldMapping {
  sourceField: ElementInfo;
  targetField: ElementInfo | null;
  isCompatible: boolean;
  transformationNeeded: boolean;
  warnings?: string[];
  canTransform: boolean;
}

export interface MigrationConfig {
  sourceContentType: ContentTypeInfo;
  targetContentType: ContentTypeInfo;
  fieldMappings: FieldMapping[];
  language: string;
}

export interface MigrationItem {
  id: string;
  name: string;
  codename: string;
  lastModified: Date;
  selected: boolean;
}

export interface MigrationProgress {
  total: number;
  processed: number;
  successful: number;
  failed: number;
  errors: MigrationError[];
}

export interface MigrationError {
  itemId: string;
  itemName: string;
  error: string;
  details?: any;
}

export interface KontentConfig {
  projectId: string;
  previewApiKey?: string;
  managementApiKey?: string;
}

// Element type compatibility mapping
export const ELEMENT_TYPE_COMPATIBILITY: Record<string, string[]> = {
  text: ['text', 'rich_text', 'url_slug'],
  rich_text: ['rich_text', 'text'],
  number: ['number', 'text'],
  multiple_choice: ['multiple_choice', 'text'],
  date_time: ['date_time', 'text'],
  asset: ['asset'],
  modular_content: ['modular_content'],
  taxonomy: ['taxonomy', 'multiple_choice'],
  url_slug: ['url_slug', 'text'],
  custom: ['custom', 'text'],
};

export const ELEMENT_TYPE_LABELS: Record<string, string> = {
  text: 'Text',
  rich_text: 'Rich Text',
  number: 'Number',
  multiple_choice: 'Multiple Choice',
  date_time: 'Date & Time',
  asset: 'Asset',
  modular_content: 'Linked Items',
  taxonomy: 'Taxonomy',
  url_slug: 'URL Slug',
  custom: 'Custom Element',
};