import { useState, useEffect } from 'react';
import { ContentTypeInfo, KontentConfig } from '../types';
import { kontentServiceInstance, validateKontentConfiguration, getConfigurationStatus } from '../config/kontent';

// Mock data for development - replace with actual Kontent service calls
const mockContentTypes: ContentTypeInfo[] = [
  {
    id: '1',
    name: 'Article',
    codename: 'article',
    elements: [
      {
        id: 'e1',
        name: 'Title',
        codename: 'title',
        type: 'text',
        isRequired: true,
      },
      {
        id: 'e2',
        name: 'Content',
        codename: 'content',
        type: 'rich_text',
        isRequired: true,
      },
      {
        id: 'e3',
        name: 'Author',
        codename: 'author',
        type: 'text',
        isRequired: false,
      },
      {
        id: 'e4',
        name: 'Published Date',
        codename: 'published_date',
        type: 'date_time',
        isRequired: false,
      },
      {
        id: 'e5',
        name: 'Category',
        codename: 'category',
        type: 'taxonomy',
        isRequired: false,
      }
    ]
  },
  {
    id: '2',
    name: 'Blog Post',
    codename: 'blog_post',
    elements: [
      {
        id: 'b1',
        name: 'Title',
        codename: 'title',
        type: 'text',
        isRequired: true,
      },
      {
        id: 'b2',
        name: 'Body',
        codename: 'body',
        type: 'rich_text',
        isRequired: true,
      },
      {
        id: 'b3',
        name: 'Author Name',
        codename: 'author_name',
        type: 'text',
        isRequired: false,
      },
      {
        id: 'b4',
        name: 'Publication Date',
        codename: 'publication_date',
        type: 'date_time',
        isRequired: false,
      },
      {
        id: 'b5',
        name: 'Tags',
        codename: 'tags',
        type: 'taxonomy',
        isRequired: false,
      },
      {
        id: 'b6',
        name: 'Featured Image',
        codename: 'featured_image',
        type: 'asset',
        isRequired: false,
      }
    ]
  },
  {
    id: '3',
    name: 'Product',
    codename: 'product',
    elements: [
      {
        id: 'p1',
        name: 'Product Name',
        codename: 'product_name',
        type: 'text',
        isRequired: true,
      },
      {
        id: 'p2',
        name: 'Description',
        codename: 'description',
        type: 'rich_text',
        isRequired: true,
      },
      {
        id: 'p3',
        name: 'Price',
        codename: 'price',
        type: 'number',
        isRequired: true,
      },
      {
        id: 'p4',
        name: 'Category',
        codename: 'category',
        type: 'taxonomy',
        isRequired: false,
      }
    ]
  }
];

export interface UseContentTypesResult {
  contentTypes: ContentTypeInfo[];
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useContentTypes(config?: KontentConfig): UseContentTypesResult {
  const [contentTypes, setContentTypes] = useState<ContentTypeInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchContentTypes = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Check if we have valid configuration
      if (validateKontentConfiguration()) {
        // Use real API
        const types = await kontentServiceInstance.getContentTypes();
        setContentTypes(types);
      } else {
        // Use mock data for development
        await new Promise(resolve => setTimeout(resolve, 800));
        setContentTypes(mockContentTypes);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch content types');
      // Fallback to mock data on error
      setContentTypes(mockContentTypes);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchContentTypes();
  }, [config?.projectId]);

  const refreshContentTypes = () => {
    void fetchContentTypes();
  };

  return {
    contentTypes,
    isLoading,
    error,
    refresh: refreshContentTypes,
  };
}

export interface UseContentItemsResult {
  items: any[];
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useContentItems(
  contentTypeCodename?: string,
  language: string = 'en'
): UseContentItemsResult {
  const [items, setItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchItems = async () => {
    if (!contentTypeCodename) {
      setItems([]);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Check if we have valid configuration for real API
      const configStatus = getConfigurationStatus();
      console.log('🔍 Fetching items for:', { contentTypeCodename, language });
      
      if (configStatus.isValid) {
        try {
          console.log('🌐 Attempting to use real Kontent.ai API...');
          // Try to use real API
          const realItems = await kontentServiceInstance.getContentItems(contentTypeCodename, language);
          console.log('✅ Successfully fetched real items:', realItems.length, 'items');
          setItems(realItems);
          return;
        } catch (apiError) {
          console.warn('❌ Failed to fetch real items, falling back to mock:', apiError);
          // Fall through to mock data
        }
      } else {
        console.log('⚠️ Using mock data - Kontent.ai not properly configured');
      }

      // Simulate API call delay
      console.log('⏳ Simulating API call...');
      await new Promise(resolve => setTimeout(resolve, 800));

      // Generate more realistic mock items
      const itemCount = Math.floor(Math.random() * 15) + 3; // 3-17 items
      const mockItems = Array.from({ length: itemCount }, (_, i) => ({
        id: `${contentTypeCodename}_${i + 1}`,
        name: generateMockItemName(contentTypeCodename, i),
        codename: `${contentTypeCodename}_${String(i + 1).padStart(3, '0')}`,
        lastModified: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000), // Last 90 days
      }));

      console.log('🎭 Generated mock items:', mockItems.length, 'items for', contentTypeCodename);
      setItems(mockItems);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch content items');
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to generate realistic item names
  const generateMockItemName = (contentType: string, index: number): string => {
    const templates = {
      article: ['Ultimate Guide to', 'How to', 'Best Practices for', 'Introduction to', 'Advanced'],
      blog: ['Weekly Update', 'News from', 'Insights about', 'Deep Dive into', 'Quick Tips for'],
      product: ['Premium', 'Essential', 'Professional', 'Starter', 'Enterprise'],
      page: ['About Us', 'Contact', 'Privacy Policy', 'Terms of Service', 'FAQ'],
      default: ['Sample', 'Demo', 'Test', 'Example', 'Template']
    };

    const typeTemplates = templates[contentType as keyof typeof templates] || templates.default;
    const template = typeTemplates[index % typeTemplates.length];
    const suffix = contentType.charAt(0).toUpperCase() + contentType.slice(1);
    
    return `${template} ${suffix} ${Math.floor(index / typeTemplates.length) + 1}`;
  };

  useEffect(() => {
    fetchItems();
  }, [contentTypeCodename, language]);

  const refreshItems = () => {
    void fetchItems();
  };

  return {
    items,
    isLoading,
    error,
    refresh: refreshItems,
  };
}