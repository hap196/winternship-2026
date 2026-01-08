interface ChatEmptyStateProps {
  firstName: string;
  uploadedDataLength: number;
  onFileUpload: (files: File[]) => void;
  onSuggestionClick: (suggestion: string) => void;
}

export default function ChatEmptyState({ 
  firstName, 
  uploadedDataLength, 
  onFileUpload, 
  onSuggestionClick 
}: ChatEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center flex-1 w-full">
      <h1 className="text-4xl font-normal text-foreground mb-4">
        What can I help with?
      </h1>
      <p className="text-sm text-muted-foreground max-w-md text-center">
        Upload both an <span className="font-medium text-foreground">.h5ad file</span> (program activity) and a{' '}
        <span className="font-medium text-foreground">.json file</span> (gene loadings) to analyze your single-cell data.
      </p>
    </div>
  );
}

