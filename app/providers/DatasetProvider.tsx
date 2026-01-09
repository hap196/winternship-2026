'use client';

import { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { ParsedDataset } from '../types';

interface DatasetContextType {
  allDatasets: ParsedDataset[];
  activeDatasets: ParsedDataset[];
  activeDatasetIds: string[];
  isLoading: boolean;
  addDatasets: (datasets: ParsedDataset[], originalFiles: File[]) => Promise<void>;
  deleteDataset: (index: number) => Promise<void>;
  removeFromActive: (index: number) => void;
  addToActive: (dataset: ParsedDataset) => void;
  isDatasetActive: (dataset: ParsedDataset) => boolean;
  toggleDatasetActive: (dataset: ParsedDataset) => Promise<void>;
  loadDatasetData: (dataset: ParsedDataset) => Promise<unknown[]>;
}

const DatasetContext = createContext<DatasetContextType | null>(null);

export function DatasetProvider({ children }: { children: ReactNode }) {
  const [activeDatasets, setActiveDatasets] = useState<ParsedDataset[]>([]);
  const [allDatasets, setAllDatasets] = useState<ParsedDataset[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadDatasets = async () => {
      try {
        const response = await fetch('/api/datasets/list');
        const { datasets } = await response.json();
        
        const parsedDatasets: ParsedDataset[] = datasets.map((ds: any) => ({
          file: {
            name: ds.fileName,
            size: ds.fileSize,
            type: ds.fileName.endsWith('.h5ad') ? 'application/octet-stream' : 'application/json',
            lastModified: new Date(ds.createdAt).getTime(),
          },
          data: [],
          columns: [],
        }));
        
        setAllDatasets(parsedDatasets);
      } catch (error) {
        console.error('Error loading datasets:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadDatasets();
  }, []);

  const addDatasets = async (datasets: ParsedDataset[], originalFiles?: File[]) => {
    setAllDatasets(prev => [...prev, ...datasets]);
    setActiveDatasets(prev => {
      const newDatasets = datasets.filter(
        dataset => !prev.some(d => d.file.name === dataset.file.name)
      );
      return [...prev, ...newDatasets];
    });
  };

  const removeFromActive = (index: number) => {
    setActiveDatasets(prev => prev.filter((_, i) => i !== index));
  };

  const addToActive = (dataset: ParsedDataset) => {
    if (!activeDatasets.find(d => d.file.name === dataset.file.name)) {
      setActiveDatasets(prev => [...prev, dataset]);
    }
  };

  const isDatasetActive = (dataset: ParsedDataset) => {
    return activeDatasets.some(d => d.file.name === dataset.file.name);
  };

  const value: DatasetContextType = {
    allDatasets,
    activeDatasets,
    activeDatasetIds: [],
    isLoading,
    addDatasets,
    deleteDataset: async () => {},
    removeFromActive,
    addToActive,
    isDatasetActive,
    toggleDatasetActive: async () => {},
    loadDatasetData: async () => [],
  };

  return (
    <DatasetContext.Provider value={value}>
      {children}
    </DatasetContext.Provider>
  );
}

export function useDatasetContext() {
  const context = useContext(DatasetContext);
  if (!context) {
    throw new Error('useDatasetContext must be used within DatasetProvider');
  }
  return context;
}
