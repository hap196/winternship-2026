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
      <h1 className="text-4xl font-normal text-foreground mb-8">
        What can I help with?
      </h1>
    </div>
  );
}

