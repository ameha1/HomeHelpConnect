"use client"

import { useAuth } from '../../context/auth-context'
import { FileUpload } from '@/components/file-upload'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react' // Add useEffect
import axios from 'axios'

export default function UploadDocumentsPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [idFile, setIdFile] = useState<File | null>(null)
  const [certFile, setCertFile] = useState<File | null>(null)
  const [backendError, setBackendError] = useState<string | null>(null)

  // Check authentication on component mount
  useEffect(() => {
    if (!user) {
      router.push('/login')
      toast({
        title: "Authentication Required",
        description: "Please login to upload documents",
        variant: "destructive",
      })
    }
  }, [user, router, toast])

  const validateFile = (file: File) => {
    const validTypes = ['application/pdf', 'image/jpeg', 'image/png']
    const maxSize = 5 * 1024 * 1024 // 5MB

    if (!validTypes.includes(file.type)) {
      return { valid: false, error: 'Only PDF, JPEG, and PNG files are allowed' }
    }

    if (file.size > maxSize) {
      return { valid: false, error: 'File size must be less than 5MB' }
    }

    return { valid: true }
  }

  const handleSubmit = async () => {
    if (!idFile || !certFile) {
      toast({
        title: "Error",
        description: "Please upload both documents",
        variant: "destructive",
      })
      return
    }

    const idValidation = validateFile(idFile)
    const certValidation = validateFile(certFile)

    if (!idValidation.valid || !certValidation.valid) {
      toast({
        title: "Invalid Files",
        description: idValidation.error || certValidation.error,
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    setBackendError(null)

    try {
      const formData = new FormData()
      formData.append('id_verification', idFile)
      formData.append('certification', certFile)

      // Get token from auth context first, fallback to localStorage
      const token = user?.token || localStorage.getItem('token')

      if (!token) {
        throw new Error('Authentication token not found')
      }

      const response = await axios.post(
        'http://localhost:8000/provider/upload-documents',
        formData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      )

      toast({
        title: "Success",
        description: "Documents uploaded successfully. Your account is under review.",
        variant: "default",
      })

      // Clear the token from localStorage after successful upload
      localStorage.removeItem('token')
      router.push('/dashboard/provider/pending_userWithDocuments')
      
    } catch (error: any) {
      let errorMessage = "Failed to upload documents. Please try again."
      
      if (error.response) {
        if (error.response.data.detail) {
          errorMessage = error.response.data.detail
        } else if (error.response.status === 401) {
          errorMessage = "Session expired. Please login again."
          router.push('/login')
        } else if (error.response.status === 403) {
          errorMessage = "Only service providers can upload documents"
        }
      } else if (error.message) {
        errorMessage = error.message
      }

      setBackendError(errorMessage)
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  
  return (
    <div className="container mx-auto py-8">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold mb-6">Upload Required Documents</h1>
        
        {backendError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            {backendError}
          </div>
        )}

        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-medium mb-2">ID Verification</h2>
            <p className="text-sm text-gray-600 mb-4">
              Please upload a government-issued ID (Driver's license, passport, etc.)
              <br />
              <span className="text-xs">Accepted formats: PDF, JPG, PNG (max 5MB)</span>
            </p>
            <FileUpload 
              accept=".pdf,.jpg,.jpeg,.png" 
              onFileChangeAction={setIdFile}
              // disabled={isLoading}
            />
            {idFile && (
              <p className="mt-2 text-sm text-green-600">
                Selected: {idFile.name} ({(idFile.size / 1024 / 1024).toFixed(2)}MB)
              </p>
            )}
          </div>

          <div>
            <h2 className="text-lg font-medium mb-2">Professional Certification</h2>
            <p className="text-sm text-gray-600 mb-4">
              Please upload your professional certification or license (if applicable)
              <br />
              <span className="text-xs">Accepted formats: PDF, JPG, PNG (max 5MB)</span>
            </p>
            <FileUpload 
              accept=".pdf,.jpg,.jpeg,.png" 
              onFileChangeAction={setCertFile}
              // disabled={isLoading}
            />
            {certFile && (
              <p className="mt-2 text-sm text-green-600">
                Selected: {certFile.name} ({(certFile.size / 1024 / 1024).toFixed(2)}MB)
              </p>
            )}
          </div>

          <div className="flex justify-end">
            <Button 
              onClick={handleSubmit}
              disabled={isLoading || !idFile || !certFile}
              className="relative"
            >
              {isLoading ? (
                <>
                  <span className="opacity-0">Submit Documents</span>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </div>
                </>
              ) : "Submit Documents"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}