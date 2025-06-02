// components/file-upload.tsx
"use client"

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { FileText, X } from 'lucide-react'


// components/file-upload.tsx
interface FileUploadProps {
    accept: string;
    onFileChangeAction: (file: File | null) => void;
    disabled?: boolean;  // Add this line
  }
  

export function FileUpload({
  accept,
  onFileChangeAction
}: {
  accept: string
  onFileChangeAction: (file: File | null) => void
}) {
  const [file, setFile] = useState<File | null>(null)

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      onFileChangeAction(selectedFile)
    }
  }, [onFileChangeAction])

  const handleRemove = useCallback(() => {
    setFile(null)
    onFileChangeAction(null)
  }, [onFileChangeAction])

  return (
    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
      {file ? (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-gray-500" />
            <span className="text-sm">{file.name}</span>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleRemove}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <label className="flex flex-col items-center justify-center cursor-pointer">
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <svg
              className="w-8 h-8 mb-4 text-gray-500"
              aria-hidden="true"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 20 16"
            >
              <path
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"
              />
            </svg>
            <p className="mb-2 text-sm text-gray-500">
              <span className="font-semibold">Click to upload</span> or drag and drop
            </p>
            <p className="text-xs text-gray-500">{accept.toUpperCase()}</p>
          </div>
          <input 
            type="file" 
            className="hidden" 
            accept={accept}
            onChange={handleChange}
          />
        </label>
      )}
    </div>
  )
}