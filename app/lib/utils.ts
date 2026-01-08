/**
 * Format bytes to human-readable file size
 */
export const formatFileSize = (bytes: number): string => {
  if (!bytes || bytes === 0) return 'Unknown size';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

/**
 * Check if two datasets are the same based on file metadata
 */
export const isSameDataset = (
  dataset1: { file?: { name: string; size: number } },
  dataset2: { file?: { name: string; size: number } }
): boolean => {
  return (
    dataset1.file?.name === dataset2.file?.name &&
    dataset1.file?.size === dataset2.file?.size
  );
};
