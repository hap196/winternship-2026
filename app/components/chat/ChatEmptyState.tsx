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
      <p className="text-base text-muted-foreground max-w-md text-center mt-2">
        To start chatting, please upload an <span className="font-medium text-foreground">.h5ad</span> and <span className="font-medium text-foreground">.json</span> file first
      </p>
    </div>
  );
}

