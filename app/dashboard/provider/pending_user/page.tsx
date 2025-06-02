"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { HomeIcon, Settings, LogOut, FileText, FileCheck, Clock, AlertCircle } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/ui/use-toast"
import ProtectedRoute from '@/components/protected-route'
import { useAuth } from '../../../context/auth-context'

export default function PendingUserDashboard() {
  const router = useRouter()
  const { toast } = useToast()
  const { user } = useAuth()
  const [userStatus] = useState({
    isVerified: false,
    needsDocuments: true
  })

  const handleUploadClick = () => {
    if (user?.token) {
      localStorage.setItem('token', user.token)
    }
    router.push("/register/upload-documents")
  }

  return (
    <SidebarProvider>
      <div className="flex h-screen bg-gray-50 overflow-hidden">
        {/* Modern Sidebar */}
        <Sidebar className="bg-white border-r h-full">
          <SidebarHeader className="border-b px-6 py-4">
            <Link href="/" className="flex items-center gap-2">
              <HomeIcon className="h-6 w-6 text-indigo-600" />
              <span className="text-lg font-bold text-gray-800">HomeHelp</span>
            </Link>
          </SidebarHeader>
          
          <SidebarContent className="px-4 py-6 flex-grow overflow-y-auto">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive>
                  <Link href="/dashboard/pending" className="flex items-center gap-3 px-4 py-2 rounded-lg bg-indigo-50 text-indigo-600">
                    <HomeIcon className="h-5 w-5" />
                    <span className="font-medium">Dashboard</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/login" className="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-gray-100 text-gray-700">
                    <LogOut className="h-5 w-5" />
                    <span className="font-medium">Logout</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarContent>
          
          <SidebarFooter className="border-t px-4 py-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 cursor-pointer">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src="/placeholder.svg" alt="User" />
                    <AvatarFallback>HC</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">Pending Account</p>
                    <p className="text-xs text-gray-500 truncate">Registration Incomplete</p>
                  </div>
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/login" className="cursor-pointer">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>
        
        {/* Main Content */}
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-white px-6 shadow-sm">
            <SidebarTrigger className="md:hidden" />
            <div className="flex-1">
              <h1 className="text-lg font-semibold text-gray-800">Complete Your Registration</h1>
            </div>
          </header>
          
          <main className="flex-1 overflow-y-auto p-6">
            <div className="grid gap-6 max-w-4xl mx-auto h-full">
              {/* Status Card */}
              <Card className="border-0 shadow-sm bg-gradient-to-r from-indigo-50 to-blue-50">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-full bg-indigo-100 text-indigo-600">
                      <AlertCircle className="h-6 w-6" />
                    </div>
                    <div>
                      <CardTitle className="text-gray-800">Action Required</CardTitle>
                      <CardDescription className="text-gray-600">
                        Complete your registration to access the provider dashboard
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-xs">
                      <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                        <FileText className="h-5 w-5 text-indigo-600" />
                        Required Documents
                      </h3>
                      
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="border border-gray-200 rounded-lg p-4 hover:border-indigo-300 transition-colors">
                          <div className="flex items-start gap-3">
                            <div className="p-2 rounded-full bg-indigo-50 text-indigo-600 mt-0.5">
                              <FileCheck className="h-4 w-4" />
                            </div>
                            <div>
                              <h4 className="font-medium text-gray-800">ID Verification</h4>
                              <p className="text-sm text-gray-600 mt-1">
                                Government-issued photo ID (Driver's license, passport, etc.)
                              </p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="border border-gray-200 rounded-lg p-4 hover:border-indigo-300 transition-colors">
                          <div className="flex items-start gap-3">
                            <div className="p-2 rounded-full bg-indigo-50 text-indigo-600 mt-0.5">
                              <FileCheck className="h-4 w-4" />
                            </div>
                            <div>
                              <h4 className="font-medium text-gray-800">Professional Certification</h4>
                              <p className="text-sm text-gray-600 mt-1">
                                License or certification for your service (if applicable)
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-6 pt-6 border-t border-gray-200">
                        <Button 
                          onClick={handleUploadClick}
                          className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-700 px-6 py-3 text-base"
                        >
                          Upload Documents Now
                        </Button>
                        <p className="text-sm text-gray-500 mt-3">
                          File formats accepted: PDF, JPG, PNG (Max 5MB each)
                        </p>
                      </div>
                    </div>
                    
                    <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-xs">
                      <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                        <Clock className="h-5 w-5 text-indigo-600" />
                        What Happens Next?
                      </h3>
                      <ul className="space-y-3">
                        <li className="flex items-start gap-3">
                          <div className="flex-shrink-0 mt-1">
                            <div className="h-2 w-2 rounded-full bg-indigo-600"></div>
                          </div>
                          <p className="text-gray-700">
                            <span className="font-medium">Document Review:</span> Our team will verify your documents within 24-48 hours
                          </p>
                        </li>
                        <li className="flex items-start gap-3">
                          <div className="flex-shrink-0 mt-1">
                            <div className="h-2 w-2 rounded-full bg-indigo-600"></div>
                          </div>
                          <p className="text-gray-700">
                            <span className="font-medium">Account Activation:</span> You'll receive an email notification once approved
                          </p>
                        </li>
                        <li className="flex items-start gap-3">
                          <div className="flex-shrink-0 mt-1">
                            <div className="h-2 w-2 rounded-full bg-indigo-600"></div>
                          </div>
                          <p className="text-gray-700">
                            <span className="font-medium">Full Access:</span> After approval, you'll gain full provider dashboard access
                          </p>
                        </li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Help Card */}
              <Card className="border-0 shadow-sm bg-white">
                <CardHeader>
                  <CardTitle className="text-gray-800">Need Help?</CardTitle>
                  <CardDescription className="text-gray-600">
                    Contact our support team if you have questions about the verification process
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="border border-gray-200 rounded-lg p-4">
                      <h4 className="font-medium text-gray-800 mb-2">Email Support</h4>
                      <p className="text-sm text-gray-600">support@homehelp.com</p>
                    </div>
                    <div className="border border-gray-200 rounded-lg p-4">
                      <h4 className="font-medium text-gray-800 mb-2">Live Chat</h4>
                      <p className="text-sm text-gray-600">Available 9am-5pm EST</p>
                    </div>
                    <div className="border border-gray-200 rounded-lg p-4">
                      <h4 className="font-medium text-gray-800 mb-2">Help Center</h4>
                      <p className="text-sm text-gray-600">Browse documentation</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  )
}