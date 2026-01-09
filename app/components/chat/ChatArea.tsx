"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import {
  HiArrowRight,
  HiPhotograph,
  HiX,
  HiStop,
  HiOutlineDatabase,
  HiArrowDown,
} from "react-icons/hi";
import ChatMessages from "./ChatMessages";
import ChatHeader from "./ChatHeader";
import FileChip from "./FileChip";
import ChatDragOverlay from "./ChatDragOverlay";
import { ParsedDataset, Message } from "../../types";
import { useChatContext } from "../../providers/ChatProvider";

interface ChatAreaProps {
  uploadedData: ParsedDataset[];
  allDatasets?: ParsedDataset[];
  onFileUpload: (files: File[]) => void;
  onSendMessage: (message: string, images?: string[]) => void;
  messages?: Message[];
  onRemoveDataset: (index: number) => void;
  onAddDataset?: (dataset: ParsedDataset) => void;
  isDatasetActive?: (dataset: ParsedDataset) => boolean;
  isLoading?: boolean;
  isTypingResponse?: boolean;
  hasMoreMessages?: boolean;
  onLoadMore?: () => void;
  onEditMessage?: (messageIndex: number, newContent: string) => void;
  isRestoringConversation?: boolean;
  areDatasetsLoading?: boolean;
}

const ChatArea = ({
  uploadedData,
  allDatasets = [],
  onFileUpload,
  onSendMessage,
  messages = [],
  onRemoveDataset,
  onAddDataset,
  isDatasetActive,
  isLoading = false,
  isTypingResponse = false,
  hasMoreMessages = false,
  onLoadMore,
  onEditMessage,
  isRestoringConversation = false,
  areDatasetsLoading = false,
}: ChatAreaProps) => {
  const [inputValue, setInputValue] = useState("");
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionIndex, setMentionIndex] = useState(0);
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);
  const [mentionedDatasets, setMentionedDatasets] = useState<ParsedDataset[]>(
    []
  );
  const [showScrollButton, setShowScrollButton] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const textInputRef = useRef<HTMLDivElement>(null);
  const dragCounter = useRef(0);
  const previousUploadedDataRef = useRef<ParsedDataset[]>([]);
  const { stopGeneration } = useChatContext();

  const SCROLL_THRESHOLD = 100;

  const filteredMentionDatasets = useMemo(
    () =>
      allDatasets.filter((d) =>
        d.file?.name?.toLowerCase().includes(mentionQuery.toLowerCase())
      ),
    [allDatasets, mentionQuery]
  );

  const hasBothRequiredFiles = useMemo(() => {
    const hasH5ad = uploadedData.some((d) => d.file.name.endsWith(".h5ad"));
    const hasJson = uploadedData.some((d) => d.file.name.endsWith(".json"));
    return hasH5ad && hasJson;
  }, [uploadedData]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (
      !isLoading &&
      !isTypingResponse &&
      !isRestoringConversation &&
      !areDatasetsLoading &&
      messages.length === 0
    ) {
      textInputRef.current?.focus();
    }
  }, [
    isLoading,
    isTypingResponse,
    isRestoringConversation,
    areDatasetsLoading,
    messages.length,
  ]);

  useEffect(() => {
    if (!textInputRef.current) return;

    const previousDatasets = previousUploadedDataRef.current;
    const newDatasets = uploadedData.filter(
      (dataset) =>
        !previousDatasets.some((prev) => prev.file?.name === dataset.file?.name)
    );

    if (newDatasets.length === 0) {
      previousUploadedDataRef.current = uploadedData;
      return;
    }

    const existingMentions = new Set<string>();
    textInputRef.current.querySelectorAll("[data-mention]").forEach((el) => {
      const mention = (el as HTMLElement).dataset.mention;
      if (mention) existingMentions.add(mention);
    });

    for (const dataset of newDatasets) {
      if (existingMentions.has(dataset.file?.name || "")) {
        continue;
      }

      const chip = document.createElement("span");
      chip.className =
        "inline-flex items-center gap-1 px-1.5 py-0.5 mx-0.5 bg-primary/15 text-primary text-sm rounded border border-primary/25 align-middle";
      chip.contentEditable = "false";
      chip.dataset.mention = dataset.file?.name || "";
      chip.innerHTML = `<span class="font-medium">@${dataset.file?.name}</span>`;

      if (
        textInputRef.current.childNodes.length === 0 ||
        textInputRef.current.innerHTML === ""
      ) {
        textInputRef.current.appendChild(chip);
        textInputRef.current.appendChild(document.createTextNode(" "));
      } else {
        textInputRef.current.appendChild(document.createTextNode(" "));
        textInputRef.current.appendChild(chip);
        textInputRef.current.appendChild(document.createTextNode(" "));
      }
    }

    setMentionedDatasets((prev) => [...prev, ...newDatasets]);
    previousUploadedDataRef.current = uploadedData;

    let text = "";
    textInputRef.current.childNodes.forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        text += node.textContent;
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement;
        if (el.dataset.mention) {
          text += `@${el.dataset.mention}`;
        } else {
          text += el.textContent;
        }
      }
    });
    setInputValue(text);

    textInputRef.current.focus();
    const range = document.createRange();
    const sel = window.getSelection();
    range.selectNodeContents(textInputRef.current);
    range.collapse(false);
    sel?.removeAllRanges();
    sel?.addRange(range);
  }, [uploadedData]);

  const handleScroll = () => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    setShowScrollButton(distanceFromBottom > SCROLL_THRESHOLD);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setUploadedImages((prev) => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      }
    });

    if (imageInputRef.current) {
      imageInputRef.current.value = "";
    }
  };

  const removeImage = (index: number) => {
    setUploadedImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRemoveDatasetChip = (index: number) => {
    const dataset = uploadedData[index];
    if (!dataset || !textInputRef.current) {
      onRemoveDataset(index);
      return;
    }

    const mentionChips =
      textInputRef.current.querySelectorAll("[data-mention]");
    mentionChips.forEach((chip) => {
      if ((chip as HTMLElement).dataset.mention === dataset.file.name) {
        chip.remove();
      }
    });

    const text = getTextContent();
    setInputValue(text);

    onRemoveDataset(index);
  };

  const handleSend = () => {
    const text = getTextContent();
    const isNewChat = messages.length === 0;

    if (isNewChat && !hasBothRequiredFiles) {
      return;
    }

    if (text.trim() || uploadedImages.length > 0) {
      onSendMessage(
        text,
        uploadedImages.length > 0 ? uploadedImages : undefined
      );
      setInputValue("");
      setUploadedImages([]);
      setMentionedDatasets([]);
      if (textInputRef.current) {
        textInputRef.current.innerHTML = "";
      }
    }
  };

  const getTextContent = () => {
    if (!textInputRef.current) return "";
    
    let text = "";
    textInputRef.current.childNodes.forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        text += node.textContent;
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement;
        if (el.dataset.mention) {
          text += `@${el.dataset.mention}`;
        } else {
          text += el.textContent;
        }
      }
    });
    return text;
  };

  const handleContentInput = () => {
    if (!textInputRef.current) return;

    const text = getTextContent();
    setInputValue(text);

    if (!text.trim() && textInputRef.current) {
      textInputRef.current.innerHTML = "";
    }

    // Check if any mentioned datasets should be removed
    const currentMentions = new Set<string>();
    textInputRef.current?.querySelectorAll("[data-mention]").forEach((el) => {
      const mention = (el as HTMLElement).dataset.mention;
      if (mention) currentMentions.add(mention);
    });

    mentionedDatasets.forEach((dataset) => {
      const fileName = dataset.file?.name || "";
      if (!currentMentions.has(fileName)) {
        setMentionedDatasets((prev) =>
          prev.filter((d) => d.file?.name !== fileName)
        );
        const activeIndex = uploadedData.findIndex(
          (d) => d.file?.name === fileName
        );
        if (activeIndex !== -1) {
          onRemoveDataset(activeIndex);
        }
      }
    });

    const selection = window.getSelection();
    if (!selection || !textInputRef.current || selection.rangeCount === 0)
      return;

    const range = selection.getRangeAt(0);

    let node: Node | null = range.startContainer;
    while (node && node !== textInputRef.current) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement;
        if (el.dataset && el.dataset.mention) {
          setShowMentionDropdown(false);
          return;
        }
      }
      node = node.parentNode;
    }

    let textBeforeCursor = "";
    const walker = document.createTreeWalker(
      textInputRef.current,
      NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
      null
    );

    let currentNode;
    let foundCursor = false;
    while ((currentNode = walker.nextNode()) && !foundCursor) {
      if (currentNode.nodeType === Node.TEXT_NODE) {
        if (currentNode === range.startContainer) {
          textBeforeCursor +=
            currentNode.textContent?.slice(0, range.startOffset) || "";
          foundCursor = true;
        } else {
          textBeforeCursor += currentNode.textContent || "";
        }
      } else if (currentNode.nodeType === Node.ELEMENT_NODE) {
        const el = currentNode as HTMLElement;
        if (el.dataset && el.dataset.mention) {
          textBeforeCursor += `@${el.dataset.mention}`;
        }
      }
    }

    const atIndex = textBeforeCursor.lastIndexOf("@");

    if (atIndex !== -1) {
      const textAfterAt = textBeforeCursor.slice(atIndex + 1);
      if (!textAfterAt.includes(" ")) {
        setShowMentionDropdown(true);
        setMentionQuery(textAfterAt);
        setMentionIndex(atIndex);
        setSelectedMentionIndex(0);
        return;
      }
    }
    setShowMentionDropdown(false);
  };

  const handleMentionSelect = (dataset: ParsedDataset) => {
    onAddDataset?.(dataset);

    if (!mentionedDatasets.some((d) => d.file?.name === dataset.file?.name)) {
      setMentionedDatasets((prev) => [...prev, dataset]);
    }

    if (!textInputRef.current) return;

    
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);

    
    let textBeforeCursor = "";
    const walker = document.createTreeWalker(
      textInputRef.current,
      NodeFilter.SHOW_TEXT,
      null
    );

    let currentNode;
    while ((currentNode = walker.nextNode())) {
      if (currentNode === range.startContainer) {
        textBeforeCursor +=
          currentNode.textContent?.slice(0, range.startOffset) || "";
        break;
      } else {
        textBeforeCursor += currentNode.textContent || "";
      }
    }

    const atIndex = textBeforeCursor.lastIndexOf("@");
    if (atIndex === -1) return;

    
    const deleteRange = document.createRange();
    const textNode = range.startContainer;
    if (textNode.nodeType === Node.TEXT_NODE && textNode.textContent) {
      const localAtIndex = textNode.textContent.lastIndexOf(
        "@",
        range.startOffset
      );
      if (localAtIndex !== -1) {
        deleteRange.setStart(textNode, localAtIndex);
        deleteRange.setEnd(textNode, range.startOffset);
        deleteRange.deleteContents();

        
        const chip = document.createElement("span");
        chip.className =
          "inline-flex items-center gap-1 px-1.5 py-0.5 mx-0.5 bg-primary/15 text-primary text-sm rounded border border-primary/25 align-middle";
        chip.contentEditable = "false";
        chip.dataset.mention = dataset.file?.name || "";
        chip.innerHTML = `<span class="font-medium">@${dataset.file?.name}</span>`;

        
        deleteRange.insertNode(chip);
        const spaceNode = document.createTextNode(" ");
        chip.parentNode?.insertBefore(spaceNode, chip.nextSibling);

        
        const newRange = document.createRange();
        newRange.setStartAfter(spaceNode);
        newRange.collapse(true);
        selection.removeAllRanges();
        selection.addRange(newRange);
      }
    }

    
    const text = getTextContent();
    setInputValue(text);
    setShowMentionDropdown(false);
    setMentionQuery("");
    textInputRef.current.focus();
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();

    const pastedText = e.clipboardData.getData("text/plain");
    const mentionPattern = /@([^\s]+\.(h5ad|json))/g;

    if (!textInputRef.current) return;

    
    const fragments: Array<{
      type: "text" | "mention";
      content: string;
      dataset?: ParsedDataset;
    }> = [];
    let lastIndex = 0;

    const matches = [...pastedText.matchAll(mentionPattern)];

    for (const match of matches) {
      const filename = match[1];
      const matchIndex = match.index!;

      
      if (matchIndex > lastIndex) {
        fragments.push({
          type: "text",
          content: pastedText.slice(lastIndex, matchIndex),
        });
      }

      
      const dataset = allDatasets.find((d) => d.file?.name === filename);
      if (dataset) {
        fragments.push({ type: "mention", content: filename, dataset });
        if (!mentionedDatasets.some((d) => d.file?.name === filename)) {
          onAddDataset?.(dataset);
          setMentionedDatasets((prev) => [...prev, dataset]);
        }
      } else {
        fragments.push({ type: "text", content: match[0] });
      }

      lastIndex = matchIndex + match[0].length;
    }

    
    if (lastIndex < pastedText.length) {
      fragments.push({ type: "text", content: pastedText.slice(lastIndex) });
    }

    
    if (fragments.length === 0) {
      fragments.push({ type: "text", content: pastedText });
    }

    
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      range.deleteContents();

      for (const fragment of fragments) {
        if (fragment.type === "text") {
          range.insertNode(document.createTextNode(fragment.content));
          range.collapse(false);
        } else {
          
          const chip = document.createElement("span");
          chip.className =
            "inline-flex items-center gap-1 px-1.5 py-0.5 mx-0.5 bg-primary/15 text-primary text-sm rounded border border-primary/25 align-middle";
          chip.contentEditable = "false";
          chip.dataset.mention = fragment.content;
          chip.innerHTML = `<span class="font-medium">@${fragment.content}</span>`;
          range.insertNode(chip);
          range.collapse(false);
          range.insertNode(document.createTextNode(" "));
          range.collapse(false);
        }
      }
    }

    
    const event = new Event("input", { bubbles: true });
    textInputRef.current.dispatchEvent(event);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (showMentionDropdown && filteredMentionDatasets.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedMentionIndex((prev) =>
          prev < filteredMentionDatasets.length - 1 ? prev + 1 : 0
        );
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedMentionIndex((prev) =>
          prev > 0 ? prev - 1 : filteredMentionDatasets.length - 1
        );
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        handleMentionSelect(filteredMentionDatasets[selectedMentionIndex]);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setShowMentionDropdown(false);
        return;
      }
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      const isNewChat = messages.length === 0;

      if (isNewChat && !hasBothRequiredFiles) {
        return;
      }

      handleSend();
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;

    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;

    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounter.current = 0;

    const files = Array.from(e.dataTransfer.files);
    const imageFiles = files.filter((file) => file.type.startsWith("image/"));
    const dataFiles = files.filter((file) => !file.type.startsWith("image/"));

    imageFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedImages((prev) => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });

    if (dataFiles.length > 0) {
      onFileUpload(dataFiles);
    }
  };

  return (
    <div
      className="flex flex-col h-screen flex-1 bg-background relative"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <ChatDragOverlay isDragging={isDragging} />
      <ChatHeader />

      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className={`flex-1 overflow-y-auto flex flex-col relative ${
          messages.length === 0 && !isLoading && !isTypingResponse
            ? "items-center justify-center"
            : "p-8"
        }`}
      >
        {isRestoringConversation || areDatasetsLoading ? (
          <div className="flex-1" />
        ) : messages.length > 0 || isLoading || isTypingResponse ? (
          <>
            <ChatMessages
              messages={messages}
              isLoading={isLoading}
              isTypingResponse={isTypingResponse}
              hasMoreMessages={hasMoreMessages}
              onLoadMore={onLoadMore}
              onEditMessage={onEditMessage}
            />
            <div ref={messagesEndRef} />
          </>
        ) : (
          <div className="w-full max-w-3xl px-4 -mt-32">
            <h1 className="text-4xl font-normal text-foreground mb-4 text-center">
              What can I help with?
            </h1>
            <p className="text-base text-muted-foreground max-w-md text-center mx-auto mb-2">
              To start chatting, please upload an{" "}
              <span className="font-medium text-foreground">.h5ad</span> and{" "}
              <span className="font-medium text-foreground">.json</span> file
              first
            </p>
            <p className="text-sm text-muted-foreground max-w-md text-center mx-auto mb-8">
              or use <span className="font-medium text-foreground">@</span> to
              mention existing files
            </p>

            <div className="w-full relative">
              {uploadedData.length > 0 && (
                <div className="flex gap-2 mb-4">
                  {uploadedData.map((dataset, index) => (
                    <FileChip
                      key={index}
                      fileName={dataset.file.name}
                      onRemove={() => handleRemoveDatasetChip(index)}
                    />
                  ))}
                </div>
              )}

              {uploadedImages.length > 0 && (
                <div className="mb-3 flex gap-2 flex-wrap justify-center">
                  {uploadedImages.map((image, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={image}
                        alt={`Upload ${index + 1}`}
                        className="h-20 w-20 object-cover rounded-lg border border-border"
                      />
                      <button
                        onClick={() => removeImage(index)}
                        className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <HiX className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {showMentionDropdown && filteredMentionDatasets.length > 0 && (
                <div className="absolute top-full left-0 mt-2 w-64 bg-card border border-border rounded-lg shadow-lg overflow-hidden z-[100]">
                  <div className="p-2 text-xs text-muted-foreground border-b border-border">
                    Add dataset
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    {filteredMentionDatasets.map((dataset, index) => (
                      <button
                        key={index}
                        onClick={() => handleMentionSelect(dataset)}
                        className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 ${
                          index === selectedMentionIndex
                            ? "bg-accent"
                            : "hover:bg-accent"
                        }`}
                      >
                        <HiOutlineDatabase className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <span className="truncate">{dataset.file?.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3 bg-background rounded-3xl border px-6 py-3 shadow-sm overflow-visible">
                <input
                  type="file"
                  ref={imageInputRef}
                  onChange={handleImageUpload}
                  accept="image/*"
                  multiple
                  className="hidden"
                />
                <button
                  onClick={() => imageInputRef.current?.click()}
                  disabled={isLoading || isTypingResponse}
                  className="flex-shrink-0 p-0 hover:opacity-70 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <HiPhotograph className="w-7 h-7" />
                </button>
                <div className="flex-1 relative">
                  <div
                    ref={textInputRef}
                    contentEditable={!isLoading && !isTypingResponse}
                    className="w-full border-0 shadow-none outline-none bg-transparent p-0 resize-none max-h-32 overflow-y-auto leading-normal empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground"
                    style={{ minHeight: "1.5em" }}
                    data-placeholder={
                      isLoading || isTypingResponse
                        ? "AI is thinking..."
                        : "Ask a question about your data"
                    }
                    onInput={handleContentInput}
                    onKeyDown={handleKeyPress}
                    onPaste={handlePaste}
                    suppressContentEditableWarning
                  />
                </div>
                {isLoading || isTypingResponse ? (
                  <button
                    onClick={stopGeneration}
                    className="flex-shrink-0 h-9 w-9 flex items-center justify-center rounded-full bg-foreground text-background hover:opacity-80 transition-opacity cursor-pointer"
                  >
                    <HiStop className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={handleSend}
                    disabled={
                      (!inputValue.trim() && uploadedImages.length === 0) ||
                      (messages.length === 0 && !hasBothRequiredFiles)
                    }
                    title={
                      messages.length === 0 && !hasBothRequiredFiles
                        ? "Both .h5ad and .json files MUST be present"
                        : ""
                    }
                    className="flex-shrink-0 h-9 w-9 flex items-center justify-center rounded-full bg-foreground text-background hover:opacity-80 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <HiArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {messages.length > 0 && (
        <>
          <button
            onClick={scrollToBottom}
            className={`absolute left-1/2 -translate-x-1/2 bottom-40 h-10 w-10 flex items-center justify-center rounded-full bg-muted border border-border shadow-lg hover:bg-accent transition-all duration-200 z-10 cursor-pointer ${
              showScrollButton ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
          >
            <HiArrowDown className="w-5 h-5 text-foreground" />
          </button>

          <div className="px-8 pb-8">
            <div className="max-w-4xl mx-auto relative">
              {uploadedData.length > 0 && (
                <div className="flex gap-2 mb-3">
                  {uploadedData.map((dataset, index) => (
                    <FileChip
                      key={index}
                      fileName={dataset.file.name}
                      onRemove={() => handleRemoveDatasetChip(index)}
                    />
                  ))}
                </div>
              )}

              {uploadedImages.length > 0 && (
                <div className="mb-3 flex gap-2 flex-wrap">
                  {uploadedImages.map((image, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={image}
                        alt={`Upload ${index + 1}`}
                        className="h-20 w-20 object-cover rounded-lg border border-border"
                      />
                      <button
                        onClick={() => removeImage(index)}
                        className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <HiX className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {showMentionDropdown && filteredMentionDatasets.length > 0 && (
                <div className="absolute bottom-16 left-8 w-64 bg-card border border-border rounded-lg shadow-lg overflow-hidden z-[100]">
                  <div className="p-2 text-xs text-muted-foreground border-b border-border">
                    Add dataset
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    {filteredMentionDatasets.map((dataset, index) => (
                      <button
                        key={index}
                        onClick={() => handleMentionSelect(dataset)}
                        className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 ${
                          index === selectedMentionIndex
                            ? "bg-accent"
                            : "hover:bg-accent"
                        }`}
                      >
                        <HiOutlineDatabase className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <span className="truncate">{dataset.file?.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3 bg-background rounded-3xl border px-6 py-3 shadow-sm overflow-visible">
                <input
                  type="file"
                  ref={imageInputRef}
                  onChange={handleImageUpload}
                  accept="image/*"
                  multiple
                  className="hidden"
                />
                <button
                  onClick={() => imageInputRef.current?.click()}
                  disabled={
                    isLoading ||
                    isTypingResponse ||
                    isRestoringConversation ||
                    areDatasetsLoading
                  }
                  className="flex-shrink-0 p-0 hover:opacity-70 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <HiPhotograph className="w-7 h-7" />
                </button>
                <div className="flex-1 relative">
                  <div
                    ref={textInputRef}
                    contentEditable={
                      !isLoading &&
                      !isTypingResponse &&
                      !isRestoringConversation &&
                      !areDatasetsLoading
                    }
                    className="w-full border-0 shadow-none outline-none bg-transparent p-0 resize-none max-h-32 overflow-y-auto leading-normal empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground"
                    style={{ minHeight: "1.5em" }}
                    data-placeholder={
                      isLoading ||
                      isTypingResponse ||
                      isRestoringConversation ||
                      areDatasetsLoading
                        ? "AI is thinking..."
                        : "Ask a question about your data"
                    }
                    onInput={handleContentInput}
                    onKeyDown={handleKeyPress}
                    onPaste={handlePaste}
                    suppressContentEditableWarning
                  />
                </div>
                {isLoading || isTypingResponse ? (
                  <button
                    onClick={stopGeneration}
                    className="flex-shrink-0 h-9 w-9 flex items-center justify-center rounded-full bg-foreground text-background hover:opacity-80 transition-opacity cursor-pointer"
                  >
                    <HiStop className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={handleSend}
                    disabled={
                      (!inputValue.trim() && uploadedImages.length === 0) ||
                      (messages.length === 0 && !hasBothRequiredFiles)
                    }
                    title={
                      messages.length === 0 && !hasBothRequiredFiles
                        ? "Both .h5ad and .json files MUST be present"
                        : ""
                    }
                    className="flex-shrink-0 h-9 w-9 flex items-center justify-center rounded-full bg-foreground text-background hover:opacity-80 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <HiArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ChatArea;
