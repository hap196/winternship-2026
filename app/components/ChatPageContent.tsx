'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import ChatArea from './chat/ChatArea';
import { useDatasetContext } from '../providers/DatasetProvider';
import { useChatContext } from '../providers/ChatProvider';
import UploadProgress from './chat/UploadProgress';

export default function ChatPageContent() {
  const { activeDatasets, allDatasets, removeFromActive, addToActive, addDatasets, isDatasetActive, isLoading: areDatasetsLoading } = useDatasetContext();
  const { 
    messages, 
    sendMessage, 
    isLoading, 
    isTypingResponse,
    pendingMessage,
    pendingImages,
    clearPendingMessage,
  } = useChatContext();
  
  const processingPendingRef = useRef(false);
  const [uploadState, setUploadState] = useState<{ fileName: string; progress: number } | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleFileUpload = async (files: File[]) => {
    const CHUNK_SIZE = 5 * 1024 * 1024;
    
    for (const file of files) {
      abortControllerRef.current = new AbortController();
      
      try {
        setUploadState({ fileName: file.name, progress: 0 });
        
        const uploadId = `ds_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
        
        for (let i = 0; i < totalChunks; i++) {
          if (abortControllerRef.current.signal.aborted) {
            throw new Error('Upload cancelled');
          }
          
          const start = i * CHUNK_SIZE;
          const end = Math.min(start + CHUNK_SIZE, file.size);
          const chunk = file.slice(start, end);
          
          const formData = new FormData();
          formData.append('chunk', chunk);
          formData.append('chunkIndex', i.toString());
          formData.append('totalChunks', totalChunks.toString());
          formData.append('fileName', file.name);
          formData.append('uploadId', uploadId);
          
          const response = await fetch('/api/datasets/upload-chunk', {
            method: 'POST',
            body: formData,
            signal: abortControllerRef.current.signal,
          });
          
          if (!response.ok) {
            throw new Error('Chunk upload failed');
          }
          
          const progress = Math.round(((i + 1) / totalChunks) * 100);
          setUploadState({ fileName: file.name, progress });
        }
        
        const parsedDataset: ParsedDataset = {
          file: {
            name: file.name,
            size: file.size,
            type: file.type,
            lastModified: file.lastModified,
          },
          data: [],
          columns: [],
        };
        
        await addDatasets([parsedDataset], [file]);
        
        setTimeout(() => setUploadState(null), 2000);
      } catch (error) {
        console.error('Upload error:', error);
        setUploadState(null);
        if (error instanceof Error && error.message !== 'Upload cancelled') {
          alert(`Failed to upload ${file.name}: ${error.message}`);
        }
      }
    }
  };

  const handleCancelUpload = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setUploadState(null);
    }
  };

  const handleSendMessage = useCallback(async (userMessage: string, images?: string[]) => {
    await sendMessage(userMessage, activeDatasets, images);
  }, [sendMessage, activeDatasets]);

  const handleEditMessage = useCallback(async (messageIndex: number, newContent: string) => {
    // TODO: Implement edit message
    console.log('Edit message not yet implemented');
  }, []);

  useEffect(() => {
    if ((pendingMessage || (pendingImages && pendingImages.length > 0)) && !isLoading && !isTypingResponse && !processingPendingRef.current) {
      processingPendingRef.current = true;
      const messageToSend = pendingMessage || '';
      const imagesToSend = pendingImages;
      clearPendingMessage();
      handleSendMessage(messageToSend, imagesToSend).finally(() => {
        processingPendingRef.current = false;
      });
    }
  }, [pendingMessage, pendingImages, isLoading, isTypingResponse, clearPendingMessage, handleSendMessage]);

  return (
    <>
      {uploadState && (
        <UploadProgress 
          fileName={uploadState.fileName}
          progress={uploadState.progress}
          onCancel={handleCancelUpload}
        />
      )}
      <ChatArea
        uploadedData={activeDatasets}
        allDatasets={allDatasets}
        onFileUpload={handleFileUpload}
        onSendMessage={handleSendMessage}
        messages={messages}
        onRemoveDataset={removeFromActive}
        onAddDataset={addToActive}
        isDatasetActive={isDatasetActive}
        isLoading={isLoading}
        isTypingResponse={isTypingResponse}
        isRestoringConversation={false}
        hasMoreMessages={false}
        onLoadMore={() => {}}
        onEditMessage={handleEditMessage}
        areDatasetsLoading={areDatasetsLoading}
      />
    </>
  );
}

