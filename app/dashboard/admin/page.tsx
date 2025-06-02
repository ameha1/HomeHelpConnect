"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { HomeIcon, Users, DollarSign, Settings, LogOut, Shield, Check, X, Loader2, RefreshCw, ChevronDown, Bell } from "lucide-react"
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
import { useState, useEffect } from "react"
import { useToast } from "@/components/ui/use-toast"
import { useRouter } from "next/navigation"
import axios from "axios"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface RegistrationRequest {
  id: number
  full_name: string
  email: string
  phone_number?: string
  years_experience?: number
  requested_at: string
  status: string
  id_verification?: string
  certification?: string
  address?: string
}

interface Provider {
  id: number
  full_name: string
  email: string
  phone_number?: string
  years_experience?: number
  is_verified: boolean
  created_at: string
  skills?: string[]
  bio?: string
  services_offered?: string[]
}


interface Report {
  id: string;
  title: string;
  description: string;
  created_at: string;
  status: string;
  booking_id: string;
  homeowner_id: string;
  provider_id: string;
  service_title: string;
  provider_name: string;
  homeowner_name: string;
}

// Add these interfaces for the actions
interface WarnProviderData {
  warning_message: string;
}

interface SuspendProviderData {
  suspension_days: number;
  suspension_reason: string;
}

const api = axios.create({
  baseURL: "http://localhost:8000",
  withCredentials: true,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("admin_token")
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !window.location.pathname.includes('/dashboard/admin/login')) {
      localStorage.removeItem("admin_token")
      window.location.href = "/dashboard/admin/login"
    }
    return Promise.reject(error)
  }
)

export default function AdminDashboard() {

  const [requests, setRequests] = useState<RegistrationRequest[]>([])
  const [providers, setProviders] = useState<Provider[]>([])
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState({
    requests: true,
    providers: true,
    reports: true
  })
  const [adminData, setAdminData] = useState({
    name: "Admin User",
    email: "admin@example.com"
  })
  const [authChecked, setAuthChecked] = useState(false)
  const [isManualRefresh, setIsManualRefresh] = useState(false)
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null)
  const [profileDialogOpen, setProfileDialogOpen] = useState(false)
  const { toast } = useToast()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<string>("approvals")
  
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [warningDialogOpen, setWarningDialogOpen] = useState(false);
  const [suspensionDialogOpen, setSuspensionDialogOpen] = useState(false);
  const [warningMessage, setWarningMessage] = useState("");
  const [suspensionDays, setSuspensionDays] = useState(7);
  const [suspensionReason, setSuspensionReason] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);


  useEffect(() => {
    const verifyAuth = async () => {
      const token = localStorage.getItem("admin_token")
      if (!token) {
        router.push("/dashboard/admin/login")
        return
      }

      try {
        await api.get("/auth/validate")
        const adminRes = await api.get("/admins/me")
        setAdminData({
          name: adminRes.data.full_name,
          email: adminRes.data.email
        })
        setAuthChecked(true)
      } catch (error) {
        console.error("Auth verification failed:", error)
        localStorage.removeItem("admin_token")
        router.push("/dashboard/admin/login")
      }
    }

    verifyAuth()
  }, [router])

  useEffect(() => {
    if (!authChecked) return;
    
    const fetchData = async () => {
      try {
        setLoading({
          requests: true,
          providers: true,
          reports: true
        });

        const [requestsRes, providersRes, reportsRes] = await Promise.all([
          api.get("/admin/registration-requests?status=pending"),
          api.get("/providers?verified=true&limit=6"),
          api.get("/get/reports")
        ]);

        setRequests(requestsRes.data);
        setProviders(providersRes.data);
        setReports(reportsRes.data);
      } catch (error) {
        console.error("Data fetch failed:", error);
        toast({
          title: "Error loading data",
          description: "Failed to fetch dashboard data",
          variant: "destructive"
        });
      } finally {
        setLoading({
          requests: false,
          providers: false,
          reports: false
        });
      }
    }
    
    fetchData();

    const intervalId = setInterval(fetchData, 10000);
    return () => clearInterval(intervalId);
  }, [authChecked, toast]);

  const handleManualRefresh = async () => {
    try {
      setIsManualRefresh(true);
      const response = await api.get("/admin/registration-requests?status=pending");
      setRequests(response.data);
      toast({
        title: "Data refreshed",
        description: "Pending requests list has been updated",
      });
    } catch (error) {
      console.error("Refresh failed:", error);
      toast({
        title: "Refresh failed",
        description: "Could not refresh pending requests",
        variant: "destructive"
      });
    } finally {
      setIsManualRefresh(false);
    }
  };

  const handleApprove = async (requestId: number) => {
    try {
      setLoading(prev => ({ ...prev, requests: true }));
      const response = await api.post(`/admin/registration-requests/${requestId}/approve`);
      
      if (response.data?.updatedRequests) {
        setRequests(response.data.updatedRequests);
      } else {
        setRequests(prev => prev.filter(req => req.id !== requestId));
      }
      
      toast({
        title: "Approval successful",
        description: "Provider account has been created",
      });
    } catch (error) {
      if (axios.isAxiosError(error)) {
        toast({
          title: "Approval failed",
          description: error.response?.data?.detail || "Could not approve request",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Approval failed",
          description: "An unexpected error occurred",
          variant: "destructive"
        });
      }
    } finally {
      setLoading(prev => ({ ...prev, requests: false }));
    }
  }
  
  const handleReject = async (requestId: number) => {
    try {
      setLoading(prev => ({ ...prev, requests: true }));
      const response = await api.post(`/admin/registration-requests/${requestId}/reject`, {
        reason: "Insufficient documentation"
      });
      
      if (response.data?.updatedRequests) {
        setRequests(response.data.updatedRequests);
      } else {
        setRequests(prev => prev.filter(req => req.id !== requestId));
      }
      
      toast({
        title: "Request rejected",
        description: "The registration request has been rejected",
      });
    } catch (error) {
      if (axios.isAxiosError(error)) {
        toast({
          title: "Rejection failed",
          description: error.response?.data?.detail || "Could not reject request",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Rejection failed",
          description: "An unexpected error occurred",
          variant: "destructive"
        });
      }
    } finally {
      setLoading(prev => ({ ...prev, requests: false }));
    }
  }

  const handleViewProfile = (provider: Provider) => {
    setSelectedProvider(provider)
    setProfileDialogOpen(true)
  }

  const handleLogout = () => {
    localStorage.removeItem("admin_token")
    router.push("/dashboard/admin/login")
  }


  const handleDismissReport = async (reportId: string) => {
    try {
      setIsProcessing(true);
      await api.post(`/reports/${reportId}/dismiss`);
      
      setReports(prev => prev.filter(r => r.id !== reportId));
      toast({
        title: "Report dismissed",
        description: "The report has been marked as resolved",
      });
    } catch (error) {
      console.error("Failed to dismiss report:", error);
      toast({
        title: "Error",
        description: "Failed to dismiss report",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleWarnProvider = async () => {
    if (!selectedReport) return;
    
    try {
      setIsProcessing(true);
      const data: WarnProviderData = {
        warning_message: warningMessage || "Behavior reported by homeowner"
      };
      
      await api.post(`/reports/${selectedReport.id}/warn`, data);
      
      setReports(prev => prev.filter(r => r.id !== selectedReport.id));
      setWarningDialogOpen(false);
      setWarningMessage("");
      
      toast({
        title: "Provider warned",
        description: "A warning has been sent to the provider",
      });
    } catch (error) {
      console.error("Failed to warn provider:", error);
      toast({
        title: "Error",
        description: "Failed to warn provider",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSuspendProvider = async () => {
    if (!selectedReport) return;
    
    try {
      setIsProcessing(true);
      const data: SuspendProviderData = {
        suspension_days: suspensionDays,
        suspension_reason: suspensionReason || "Account suspended due to homeowner report"
      };
      
      await api.post(`/reports/${selectedReport.id}/suspend`, data);
      
      setReports(prev => prev.filter(r => r.id !== selectedReport.id));
      setSuspensionDialogOpen(false);
      setSuspensionDays(7);
      setSuspensionReason("");
      
      toast({
        title: "Provider suspended",
        description: `Provider account has been suspended for ${suspensionDays} days`,
      });
    } catch (error) {
      console.error("Failed to suspend provider:", error);
      toast({
        title: "Error",
        description: "Failed to suspend provider",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };


  if (!authChecked) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 mx-auto"></div>
          <p className="text-gray-600">Verifying authentication...</p>
        </div>
      </div>
    )
  }

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        {/* Sidebar Navigation */}
        <Sidebar className="bg-gradient-to-b from-indigo-900 to-indigo-800 text-white shadow-xl h-full">
          <SidebarHeader className="border-b border-indigo-700 px-4 h-16">
            <div className="flex items-center gap-2 h-full">
              <Link href="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
                <div className="p-2 bg-white rounded-lg">
                  <HomeIcon className="h-5 w-5 text-indigo-700" />
                </div>
                <span className="text-lg font-bold">HomeHelp Admin</span>
              </Link>
            </div>
          </SidebarHeader>
          
          <SidebarContent className="px-2 h-[calc(100%-8rem)] overflow-y-auto">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive>
                  <Link href="/dashboard/admin" className="group flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors hover:bg-white/10">
                    <div className="p-1.5 rounded-md bg-white/10 group-hover:bg-white/20 transition-colors">
                      <HomeIcon className="h-4 w-4" />
                    </div>
                    <span>Dashboard</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/dashboard/admin/providers" className="group flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors hover:bg-white/10">
                    <div className="p-1.5 rounded-md bg-white/10 group-hover:bg-white/20 transition-colors">
                      <Users className="h-4 w-4" />
                    </div>
                    <span>Service Providers</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/dashboard/admin/homeowners" className="group flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors hover:bg-white/10">
                    <div className="p-1.5 rounded-md bg-white/10 group-hover:bg-white/20 transition-colors">
                      <Users className="h-4 w-4" />
                    </div>
                    <span>Homeowners</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarContent>
          
          <SidebarFooter className="border-t border-indigo-700 p-4 h-16">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 w-full p-2 rounded-lg hover:bg-white/10 transition-colors">
                  <Avatar className="h-9 w-9 border-2 border-white">
                    <AvatarFallback className="bg-indigo-600">
                      {adminData.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-left overflow-hidden">
                    <p className="text-sm font-medium truncate">{adminData.name}</p>
                    <p className="text-xs text-white/70 truncate">{adminData.email}</p>
                  </div>
                  <ChevronDown className="h-4 w-4 text-white/70" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end">
                <DropdownMenuLabel>Admin Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-red-600 hover:text-red-700">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-white px-6 shadow-sm">
            <SidebarTrigger className="text-gray-700 hover:text-indigo-600" />
            
            <div className="flex-1">
              <h1 className="text-lg font-semibold">Admin Dashboard</h1>
            </div>
            
            <div className="flex items-center gap-4">
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleManualRefresh}
                disabled={isManualRefresh || loading.requests}
                className="hover:bg-indigo-50 hover:text-indigo-600"
              >
                {isManualRefresh ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                <span className="ml-2">Refresh</span>
              </Button>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 focus:outline-none">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-indigo-600 text-white">
                        {adminData.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden md:inline text-sm font-medium">Admin</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end">
                  <DropdownMenuLabel>Admin Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-red-600 hover:text-red-700">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>
          
          <main className="flex-1 p-6 overflow-auto">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-800">Welcome back, {adminData.name.split(' ')[0]}!</h1>
              <p className="text-gray-600">Here's what's happening with your platform today</p>
            </div>
            
            {/* Stats Cards */}
            <div className="grid gap-6 mb-8 md:grid-cols-2 lg:grid-cols-3">
              <Card className="hover:shadow-md transition-shadow h-full">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">Total Users</CardTitle>
                  <div className="p-2 rounded-lg bg-indigo-100 text-indigo-600">
                    <Users className="h-4 w-4" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">1,234</div>
                  <p className="text-xs text-green-500 mt-1">+156 from last month</p>
                </CardContent>
              </Card>
              
              <Card className="hover:shadow-md transition-shadow h-full">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">Service Providers</CardTitle>
                  <div className="p-2 rounded-lg bg-green-100 text-green-600">
                    <Users className="h-4 w-4" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{providers.length}</div>
                  <p className="text-xs text-green-500 mt-1">+{Math.floor(providers.length * 0.2)} from last month</p>
                </CardContent>
              </Card>
              
              <Card className="hover:shadow-md transition-shadow h-full">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">Pending Approvals</CardTitle>
                  <div className="p-2 rounded-lg bg-purple-100 text-purple-600">
                    <Shield className="h-4 w-4" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{requests.length}</div>
                  <p className="text-xs text-green-500 mt-1">{requests.length} new requests</p>
                </CardContent>
              </Card>
            </div>

            {/* Tabbed Content Section */}
            <Tabs defaultValue="approvals" className="flex-1 flex flex-col" value={activeTab} onValueChange={setActiveTab}>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <TabsList className="grid w-full sm:w-auto grid-cols-3 gap-1 bg-gray-100 p-1 rounded-lg">
                  <TabsTrigger 
                    value="approvals" 
                    className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md px-4 py-1.5 text-sm font-medium transition-all"
                  >
                    Pending Approvals
                  </TabsTrigger>
                  <TabsTrigger 
                    value="providers" 
                    className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md px-4 py-1.5 text-sm font-medium transition-all"
                  >
                    Recent Providers
                  </TabsTrigger>
                  <TabsTrigger 
                    value="reports" 
                    className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md px-4 py-1.5 text-sm font-medium transition-all"
                  >
                    User Reports
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* Pending Approvals Tab */}
              <TabsContent value="approvals" className="flex-1 overflow-y-auto">
                {loading.requests ? (
                  <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
                  </div>
                ) : requests.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-4 text-center">
                    <div className="p-4 bg-indigo-100 rounded-full">
                      <Shield className="h-6 w-6 text-indigo-600" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900">No pending approvals</h3>
                    <p className="text-gray-500 max-w-md">
                      There are currently no pending registration requests to review.
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {requests.map((request) => (
                      <Card key={request.id} className="hover:shadow-lg transition-shadow h-full flex flex-col">
                        <CardHeader className="p-4">
                          <div className="flex items-center gap-4">
                            <Avatar>
                              <AvatarFallback className="bg-indigo-100 text-indigo-600">
                                {request.full_name.split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <CardTitle className="text-lg">{request.full_name}</CardTitle>
                              <CardDescription className="mt-1">{request.email}</CardDescription>
                            </div>
                          </div>
                        </CardHeader>
                        
                        <CardContent className="p-4 pt-0 flex-1">
                          <div className="space-y-4">
                            <div>
                              <p className="text-sm font-medium text-gray-500">Contact</p>
                              <p>{request.phone_number || 'Not provided'}</p>
                            </div>
                            
                            <div>
                              <p className="text-sm font-medium text-gray-500">Experience</p>
                              <p>{request.years_experience ? `${request.years_experience} years` : 'Not specified'}</p>
                            </div>
                            
                            <div>
                              <p className="text-sm font-medium text-gray-500">Documents</p>
                              <div className="flex gap-2 mt-1">
                                {request.id_verification && (
                                  <a 
                                    href={request.id_verification} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-sm text-blue-600 hover:underline"
                                  >
                                    ID Verification
                                  </a>
                                )}
                                {request.certification && (
                                  <a 
                                    href={request.certification} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-sm text-blue-600 hover:underline"
                                  >
                                    Certification
                                  </a>
                                )}
                                {!request.id_verification && !request.certification && (
                                  <span className="text-sm text-gray-500">No documents uploaded</span>
                                )}
                              </div>
                            </div>
                            
                            <div className="text-sm text-gray-500">
                              Requested: {new Date(request.requested_at).toLocaleDateString()}
                            </div>
                          </div>
                        </CardContent>
                        
                        <CardFooter className="flex justify-between gap-2 p-4 border-t">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleReject(request.id)}
                            className="flex-1 hover:bg-red-50 hover:text-red-600"
                          >
                            <X className="h-4 w-4 mr-2" />
                            Reject
                          </Button>
                          <Button 
                            size="sm"
                            onClick={() => handleApprove(request.id)}
                            className="flex-1 hover:bg-green-50 hover:text-green-600"
                          >
                            <Check className="h-4 w-4 mr-2" />
                            Approve
                          </Button>
                        </CardFooter>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Recent Providers Tab */}
              <TabsContent value="providers" className="flex-1 overflow-y-auto">
                {loading.providers ? (
                  <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
                  </div>
                ) : providers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-4 text-center">
                    <div className="p-4 bg-indigo-100 rounded-full">
                      <Users className="h-6 w-6 text-indigo-600" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900">No providers found</h3>
                    <p className="text-gray-500 max-w-md">
                      There are currently no registered service providers.
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {providers.map((provider) => (
                      <Card key={provider.id} className="hover:shadow-lg transition-shadow h-full flex flex-col">
                        <CardHeader className="p-4">
                          <div className="flex items-center gap-4">
                            <Avatar>
                              <AvatarFallback className="bg-indigo-100 text-indigo-600">
                                {provider.full_name.split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <CardTitle className="text-lg">{provider.full_name}</CardTitle>
                              <CardDescription className="mt-1">{provider.email}</CardDescription>
                            </div>
                          </div>
                        </CardHeader>
                        
                        <CardContent className="p-4 pt-0 flex-1">
                          <div className="space-y-3">
                            <div>
                              <p className="text-sm font-medium text-gray-500">Experience</p>
                              <p>{provider.years_experience || 'Not specified'} years</p>
                            </div>
                            
                            <div>
                              <p className="text-sm font-medium text-gray-500">Status</p>
                              <span className={`text-xs px-2 py-1 rounded-full ${
                                provider.is_verified ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {provider.is_verified ? 'Verified' : 'Pending Verification'}
                              </span>
                            </div>
                            
                            <div className="text-sm text-gray-500">
                              Joined: {new Date(provider.created_at).toLocaleDateString()}
                            </div>
                          </div>
                        </CardContent>
                        
                        <CardFooter className="p-4 border-t">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="w-full"
                            onClick={() => handleViewProfile(provider)}
                          >
                            View Profile
                          </Button>
                        </CardFooter>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* User Reports Tab */}
              <TabsContent value="reports" className="flex-1 overflow-y-auto">
    {loading.reports ? (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    ) : reports.length === 0 ? (
      <div className="flex flex-col items-center justify-center py-12 gap-4 text-center">
        <div className="p-4 bg-indigo-100 rounded-full">
          <Shield className="h-6 w-6 text-indigo-600" />
        </div>
        <h3 className="text-lg font-medium text-gray-900">No reports found</h3>
        <p className="text-gray-500 max-w-md">
          There are currently no open user reports to review.
        </p>
      </div>
    ) : (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {reports.map((report) => (
          <Card key={report.id} className="hover:shadow-lg transition-shadow h-full flex flex-col">
            <CardHeader className="p-4">
              <CardTitle className="text-lg">{report.title}</CardTitle>
              <CardDescription>
                Reported on {new Date(report.created_at).toLocaleDateString()}
              </CardDescription>
            </CardHeader>
            
            <CardContent className="p-4 pt-0 flex-1 space-y-3">
              <div>
                <p className="text-sm font-medium text-gray-500">Service</p>
                <p>{report.service_title}</p>
              </div>
              
              <div>
                <p className="text-sm font-medium text-gray-500">Description</p>
                <p className="text-gray-700">{report.description}</p>
              </div>
              
              <div>
                <p className="text-sm font-medium text-gray-500">Reported by</p>
                <p>{report.homeowner_name}</p>
              </div>
              
              <div>
                <p className="text-sm font-medium text-gray-500">Provider</p>
                <p>{report.provider_name}</p>
              </div>
              
              <div className="flex justify-between items-center">
                <span className={`text-xs px-2 py-1 rounded-full ${
                  report.status === 'open' ? 'bg-blue-100 text-blue-800' :
                  report.status === 'resolved' ? 'bg-green-100 text-green-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                </span>
              </div>
            </CardContent>
            
            <CardFooter className="flex gap-2 p-4 border-t">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  setSelectedReport(report);
                  handleDismissReport(report.id);
                }}
                className="flex-1"
                disabled={isProcessing}
              >
                {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Dismiss"}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" className="flex-1">
                    Actions
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuLabel>Report Actions</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => {
                      setSelectedReport(report);
                      setWarningDialogOpen(true);
                    }}
                  >
                    Send Warning
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => {
                      setSelectedReport(report);
                      setSuspensionDialogOpen(true);
                    }}
                  >
                    Suspend Account
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </CardFooter>
          </Card>
        ))}
      </div>
    )}
  </TabsContent>
            </Tabs>
          </main>
        </div>

        {/* Provider Profile Dialog */}
        <Dialog open={profileDialogOpen} onOpenChange={setProfileDialogOpen}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Provider Profile</DialogTitle>
            </DialogHeader>
            {selectedProvider && (
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarFallback className="bg-indigo-100 text-indigo-600 text-xl">
                      {selectedProvider.full_name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="text-xl font-bold">{selectedProvider.full_name}</h3>
                    <p className="text-gray-600">{selectedProvider.email}</p>
                    <span className={`text-xs px-2 py-1 rounded-full mt-1 inline-block ${
                      selectedProvider.is_verified ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {selectedProvider.is_verified ? 'Verified' : 'Pending Verification'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h4 className="font-medium text-gray-900">Contact Information</h4>
                    <div className="space-y-1">
                      <p className="text-sm">
                        <span className="text-gray-500">Phone:</span> {selectedProvider.phone_number || 'Not provided'}
                      </p>
                      <p className="text-sm">
                        <span className="text-gray-500">Experience:</span> {selectedProvider.years_experience || 'Not specified'} years
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-medium text-gray-900">Account Details</h4>
                    <div className="space-y-1">
                      <p className="text-sm">
                        <span className="text-gray-500">Member since:</span> {new Date(selectedProvider.created_at).toLocaleDateString()}
                      </p>
                      <p className="text-sm">
                        <span className="text-gray-500">Status:</span> {selectedProvider.is_verified ? 'Verified' : 'Pending Verification'}
                      </p>
                    </div>
                  </div>
                </div>

                {selectedProvider.bio && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-gray-900">Bio</h4>
                    <p className="text-sm text-gray-700">{selectedProvider.bio}</p>
                  </div>
                )}

               {(selectedProvider.skills && selectedProvider.skills.length > 0) && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-gray-900">Skills</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedProvider.skills.map((skill, index) => (
                        <span key={index} className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {selectedProvider.services_offered && selectedProvider.services_offered.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-gray-900">Services Offered</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedProvider.services_offered.map((service, index) => (
                        <span key={index} className="px-2 py-1 bg-indigo-100 text-indigo-800 text-xs rounded-full">
                          {service}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-4">
                  <Button 
                    variant="outline" 
                    onClick={() => setProfileDialogOpen(false)}
                  >
                    Close
                  </Button>
                  <Button>
                    View Full Profile
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
      <Dialog open={warningDialogOpen} onOpenChange={setWarningDialogOpen}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Send Warning to Provider</DialogTitle>
      </DialogHeader>
      <div className="space-y-4">
        <p>You are about to send a warning to <strong>{selectedReport?.provider_name}</strong> regarding report: <strong>{selectedReport?.title}</strong></p>
        
        <div className="space-y-2">
          <label htmlFor="warning-message" className="block text-sm font-medium text-gray-700">
            Warning Message
          </label>
          <textarea
            id="warning-message"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            rows={3}
            value={warningMessage}
            onChange={(e) => setWarningMessage(e.target.value)}
            placeholder="Enter warning message..."
          />
        </div>
        
        <div className="flex justify-end gap-2">
          <Button 
            variant="outline" 
            onClick={() => setWarningDialogOpen(false)}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleWarnProvider}
            disabled={isProcessing}
          >
            {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send Warning"}
          </Button>
        </div>
      </div>
    </DialogContent>
  </Dialog>

  {/* Suspension Dialog */}
  <Dialog open={suspensionDialogOpen} onOpenChange={setSuspensionDialogOpen}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Suspend Provider Account</DialogTitle>
      </DialogHeader>
      <div className="space-y-4">
        <p>You are about to suspend <strong>{selectedReport?.provider_name}</strong> due to report: <strong>{selectedReport?.title}</strong></p>
        
        <div className="space-y-2">
          <label htmlFor="suspension-days" className="block text-sm font-medium text-gray-700">
            Suspension Duration (days)
          </label>
          <input
            type="number"
            id="suspension-days"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            min="1"
            max="30"
            value={suspensionDays}
            onChange={(e) => setSuspensionDays(Number(e.target.value))}
          />
        </div>
        
        <div className="space-y-2">
          <label htmlFor="suspension-reason" className="block text-sm font-medium text-gray-700">
            Reason for Suspension
          </label>
          <textarea
            id="suspension-reason"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            rows={3}
            value={suspensionReason}
            onChange={(e) => setSuspensionReason(e.target.value)}
            placeholder="Enter suspension reason..."
          />
        </div>
        
        <div className="flex justify-end gap-2">
          <Button 
            variant="outline" 
            onClick={() => setSuspensionDialogOpen(false)}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSuspendProvider}
            disabled={isProcessing}
          >
            {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Suspend Account"}
          </Button>
        </div>
      </div>
    </DialogContent>
  </Dialog>
    </SidebarProvider>
  )
}




 