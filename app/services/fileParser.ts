import { ParsedDataset } from '../types';

export const parseFile = async (file: File): Promise<ParsedDataset> => {
  const extension = file.name.split('.').pop()?.toLowerCase();

  if (extension === 'h5ad') {
    return parseH5AD(file);
  } 
  
  if (extension === 'json') {
    return parseJSON(file);
  } 
  
  throw new Error('Unsupported file type. Please upload .h5ad or .json files.');
};

const parseH5AD = async (file: File): Promise<ParsedDataset> => {
  return {
    file: {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified
    },
    data: [],
    columns: [],
  };
};

const parseJSON = async (file: File): Promise<ParsedDataset> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const jsonData = JSON.parse(content);
        
        let data: Record<string, any>[] = [];
        let columns: string[] = [];
        
        if (Array.isArray(jsonData)) {
          data = jsonData;
          if (jsonData.length > 0) {
            columns = Object.keys(jsonData[0]);
          }
        } else if (typeof jsonData === 'object') {
          columns = Object.keys(jsonData);
          data = [jsonData];
        }
        
        resolve({
          file: {
            name: file.name,
            size: file.size,
            type: file.type,
            lastModified: file.lastModified
          },
          data,
          columns,
        });
      } catch (error) {
        reject(new Error('Invalid JSON file'));
      }
    };
    
    reader.onerror = () => reject(new Error('Error reading file'));
    reader.readAsText(file);
  });
};

export const formatFullDataForLLM = (datasets: ParsedDataset[]): string => {
  if (datasets.length === 0) return '';
  
  const datasetDescriptions = datasets.map(dataset => {
    const fileName = dataset.file.name;
    const extension = fileName.split('.').pop()?.toLowerCase();
    
    if (extension === 'h5ad') {
      return `Dataset: ${fileName} (H5AD file - single-cell data)`;
    } else if (extension === 'json') {
      return `Dataset: ${fileName}
Columns: ${dataset.columns.join(', ')}
Sample data: ${JSON.stringify(dataset.data.slice(0, 5), null, 2)}`;
    }
    
    return `Dataset: ${fileName}`;
  });
  
  return datasetDescriptions.join('\n\n');
};
