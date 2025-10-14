import { 
  createDeliveryClient,
  DeliveryClient,
} from '@kontent-ai/delivery-sdk';

import {
  createManagementClient,
  ManagementClient,
  ContentTypeModels,
} from '@kontent-ai/management-sdk';

import { KontentConfig, ContentTypeInfo, ElementInfo } from '../types';

export class KontentService {
  private readonly deliveryClient: DeliveryClient;
  private readonly managementClient: ManagementClient;

  constructor(config: KontentConfig) {
    this.deliveryClient = createDeliveryClient({
      environmentId: config.projectId,
      previewApiKey: config.previewApiKey,
      defaultQueryConfig: {
        usePreviewMode: !!config.previewApiKey,
      },
    });

    this.managementClient = createManagementClient({
      environmentId: config.projectId, // Note: SDK uses environmentId, not projectId
      apiKey: config.managementApiKey || '',
    });
  }

  async getContentTypes(): Promise<ContentTypeInfo[]> {
    try {
      const response = await this.managementClient.listContentTypes().toPromise();
      
      return response.data.items.map(this.mapContentTypeToInfo);
    } catch (error) {
      console.error('Error fetching content types:', error);
      throw new Error('Failed to fetch content types');
    }
  }

  async getContentType(codename: string): Promise<ContentTypeInfo> {
    try {
      const response = await this.managementClient.viewContentType()
        .byTypeCodename(codename)
        .toPromise();
      
      return this.mapContentTypeToInfo(response.data);
    } catch (error) {
      console.error(`Error fetching content type ${codename}:`, error);
      throw new Error(`Failed to fetch content type: ${codename}`);
    }
  }

  async getContentItems(contentTypeCodename: string, languageCodename: string = 'default') {
    try {
      const response = await this.deliveryClient
        .items()
        .type(contentTypeCodename)
        .languageParameter(languageCodename)
        .toPromise();

      return response.data.items.map(item => ({
        id: item.system.id,
        name: item.system.name,
        codename: item.system.codename,
        lastModified: new Date(item.system.lastModified),
        selected: false,
      }));
    } catch (error) {
      console.error(`Error fetching content items for ${contentTypeCodename}:`, error);
      throw new Error(`Failed to fetch content items for: ${contentTypeCodename}`);
    }
  }

  async getLanguages() {
    try {
      const response = await this.managementClient.listLanguages().toPromise();
      return response.data.items;
    } catch (error) {
      console.error('Error fetching languages:', error);
      throw new Error('Failed to fetch languages');
    }
  }

  private mapContentTypeToInfo(contentType: ContentTypeModels.ContentType): ContentTypeInfo {
    return {
      id: contentType.id || '',
      name: contentType.name || '',
      codename: contentType.codename || '',
      elements: contentType.elements?.map(this.mapElementToInfo) || [],
    };
  }

  private mapElementToInfo(element: any): ElementInfo {
    return {
      id: element.id || '',
      name: element.name || '',
      codename: element.codename || '',
      type: element.type || '',
      guidelines: element.guidelines,
      isRequired: element.is_required || false,
      options: this.getElementOptions(element),
    };
  }

  private getElementOptions(element: any): any[] | undefined {
    // Handle different element types that have options
    if (element.type === 'multiple_choice' && 'options' in element) {
      return element.options;
    }
    if (element.type === 'taxonomy' && 'taxonomy_group' in element) {
      return [element.taxonomy_group];
    }
    return undefined;
  }
}