"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { HomeIcon, Star, Edit, Trash2, Search, AlertCircle } from "lucide-react"
import { AddServiceDialog } from "@/components/add-service-dialog"
import { useToast } from "@/hooks/use-toast"
import { useState, useEffect } from "react"
import { Service, getServicesByProvider, createService } from "@/lib/api"
import api from '@/lib/api'
import { Input } from "@/components/ui/input"
import Image from "next/image"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

const ServiceImage = ({ src, alt, className = "" }: { 
  src: string, 
  alt: string, 
  className?: string 
}) => {
  const [imgSrc, setImgSrc] = useState(src);

  return (
    <div className={`relative w-full h-full ${className}`}>
      <Image
        src={imgSrc || '/placeholder-service.jpg'}
        alt={alt}
        fill
        className="object-cover"
        onError={() => setImgSrc('/placeholder-service.jpg')}
        unoptimized={imgSrc?.startsWith('/')}
      />
    </div>
  );
};

interface ServiceWithExtras extends Service {
  image: string;
  rating: number;
  provider_name: string;
  price: number;
}

export default function ProviderServicesPage() {
  const { toast } = useToast()
  const [services, setServices] = useState<ServiceWithExtras[]>([])
  const [filteredServices, setFilteredServices] = useState<ServiceWithExtras[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingService, setEditingService] = useState<ServiceWithExtras | null>(null)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [serviceToDelete, setServiceToDelete] = useState<Service | null>(null);

  useEffect(() => {
    const fetchServices = async () => {
      setLoading(true)
      try {
        const data = await getServicesByProvider()
        const servicesWithImages = data.map(service => ({
          ...service,
          image: service.image 
            ? service.image.startsWith('http') 
              ? service.image 
              : `${process.env.NEXT_PUBLIC_API_BASE_URL}${service.image}`
            : '/placeholder-service.jpg',
          rating: service.rating ?? 0,
          provider_name: service.provider_name || "Your Service",
          price: service.price ? Number(service.price) : 0
        }))
        setServices(servicesWithImages)
        setFilteredServices(servicesWithImages)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }
    fetchServices()
  }, [])

  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredServices(services)
    } else {
      const filtered = services.filter(service =>
        service.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        service.description.toLowerCase().includes(searchTerm.toLowerCase())
      )
      setFilteredServices(filtered)
    }
  }, [searchTerm, services])


    const fetchProviderServices = async () => {
      setLoading(true)
      try {
        const data = await getServicesByProvider()
        const servicesWithImages = data.map(service => ({
          ...service,
          image: service.image 
            ? service.image.startsWith('http') 
              ? service.image 
              : `${process.env.NEXT_PUBLIC_BASE_URL || ''}${service.image}`
            : '/placeholder-service.jpg',
          rating: service.rating ?? 0,
          provider_name: service.provider_name || "Your Service",
          price: service.price ? Number(service.price) : 0
        }))
        setServices(servicesWithImages)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }


  const handleAddService = async (serviceData: {
    title: string;
    description: string;
    price: string;
    image?: File;
  }) => {
    try {
      const formData = new FormData()
      formData.append('title', serviceData.title)
      formData.append('description', serviceData.description)
      formData.append('price', serviceData.price)
      if (serviceData.image) {
        formData.append('image', serviceData.image)
      }

      await api.post('/services', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })

      const data = await getServicesByProvider()
      const servicesWithImages = data.map(service => ({
        ...service,
        image: service.image 
          ? service.image.startsWith('http') 
            ? service.image 
            : `${process.env.NEXT_PUBLIC_API_BASE_URL}${service.image}`
          : '/placeholder-service.jpg',
        rating: service.rating ?? 0,
        provider_name: service.provider_name || "Your Service",
        price: service.price ? Number(service.price) : 0
      }))
      setServices(servicesWithImages)
      setFilteredServices(servicesWithImages)
      toast({
        title: "Service added",
        description: "Your new service has been added successfully.",
      })
    } catch (err) {
      console.error("Failed to add service:", err)
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to add service",
        variant: "destructive"
      })
    }
  }

  const updateService = async (serviceId: string, updatedService: Partial<Service>) => {
    try {
      await api.patch(`/services/${serviceId}`, updatedService)
      const data = await getServicesByProvider()
      const servicesWithImages = data.map(service => ({
        ...service,
        image: service.image 
          ? service.image.startsWith('http') 
            ? service.image 
            : `${process.env.NEXT_PUBLIC_API_BASE_URL}${service.image}`
          : '/placeholder-service.jpg',
        rating: service.rating ?? 0,
        provider_name: service.provider_name || "Your Service",
        price: service.price ? Number(service.price) : 0
      }))
      setServices(servicesWithImages)
      setFilteredServices(servicesWithImages.filter(service =>
        service.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        service.description.toLowerCase().includes(searchTerm.toLowerCase())
      ))
      toast({
        title: "Service updated",
        description: "Your service has been successfully updated.",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update service",
        variant: "destructive"
      })
      throw error
    }
  }

  const deleteService = async (serviceId: string) => {
    try {
      await api.delete(`/services/${serviceId}`)
      const data = await getServicesByProvider()
      const servicesWithImages = data.map(service => ({
        ...service,
        image: service.image 
          ? service.image.startsWith('http') 
            ? service.image 
            : `${process.env.NEXT_PUBLIC_API_BASE_URL}${service.image}`
          : '/placeholder-service.jpg',
        rating: service.rating ?? 0,
        provider_name: service.provider_name || "Your Service",
        price: service.price ? Number(service.price) : 0
      }))
      setServices(servicesWithImages)
      setFilteredServices(servicesWithImages.filter(service =>
        service.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        service.description.toLowerCase().includes(searchTerm.toLowerCase())
      ))
      toast({
        title: "Service deleted",
        description: "Your service has been successfully removed.",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete service",
        variant: "destructive"
      })
      throw error
    }
  }

  const EditServiceDialog = () => (
    <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
      <DialogContent className="bg-white/95 backdrop-blur-sm rounded-xl">
        <DialogHeader>
          <DialogTitle className="text-teal-600">Edit Service</DialogTitle>
          <DialogDescription className="text-gray-600">
            Update your service details below.
          </DialogDescription>
        </DialogHeader>
        {editingService && (
          <form 
            onSubmit={async (e) => {
              e.preventDefault()
              try {
                setLoading(true)
                const formData = new FormData(e.currentTarget)
                const updatedService = {
                  title: formData.get('title') as string,
                  description: formData.get('description') as string,
                  price: Number(formData.get('price')),
                  image: formData.get('image') as string || editingService.image
                }
                
                await updateService(editingService.id.toString(), updatedService)
                setShowEditDialog(false)
              } catch (error) {
                toast({
                  title: "Error",
                  description: error instanceof Error ? error.message : "Failed to update service",
                  variant: "destructive"
                })
              } finally {
                setLoading(false)
              }
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="title" className="text-gray-700">Service Title</Label>
              <Input 
                id="title" 
                name="title" 
                defaultValue={editingService.title} 
                required 
                className="border-gray-200 focus:ring-teal-400 focus:border-teal-400"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description" className="text-gray-700">Description</Label>
              <Textarea 
                id="description" 
                name="description" 
                defaultValue={editingService.description} 
                required 
                className="border-gray-200 focus:ring-teal-400 focus:border-teal-400"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="price" className="text-gray-700">Price (Birr)</Label>
              <Input 
                id="price" 
                name="price" 
                type="number" 
                defaultValue={editingService.price} 
                required 
                className="border-gray-200 focus:ring-teal-400 focus:border-teal-400"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="image" className="text-gray-700">Image URL (optional)</Label>
              <Input 
                id="image" 
                name="image" 
                type="url" 
                defaultValue={editingService.image} 
                className="border-gray-200 focus:ring-teal-400 focus:border-teal-400"
              />
            </div>
            
            <div className="flex justify-end gap-2 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setShowEditDialog(false)}
                className="border-gray-300 text-gray-600 hover:bg-gray-100"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={loading}
                className="bg-gradient-to-r from-teal-500 to-indigo-600 text-white hover:bg-gradient-to-l"
              >
                {loading ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )

  const DeleteServiceConfirmation = () => (
  <Dialog open={!!serviceToDelete} onOpenChange={(open) => !open && setServiceToDelete(null)}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Are you sure?</DialogTitle>
        <DialogDescription>
          This will permanently delete "{serviceToDelete?.title}" and cannot be undone.
        </DialogDescription>
      </DialogHeader>
      <div className="flex justify-end gap-2 pt-4">
        <Button 
          variant="outline" 
          onClick={() => setServiceToDelete(null)}
        >
          Cancel
        </Button>
        <Button 
          variant="destructive"
          onClick={async () => {
            if (!serviceToDelete) return;
            try {
              setLoading(true);
              await deleteService(serviceToDelete.id.toString());
              await fetchProviderServices();
              toast({
                title: "Service deleted",
                description: "Your service has been successfully removed.",
              });
            } catch (error) {
              toast({
                title: "Error",
                description: error instanceof Error ? error.message : "Failed to delete service",
                variant: "destructive"
              });
            } finally {
              setLoading(false);
              setServiceToDelete(null);
            }
          }}
          disabled={loading}
        >
          {loading ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Deleting...
            </>
          ) : "Confirm Delete"}
        </Button>
      </div>
    </DialogContent>
  </Dialog>
)

  return (
    <div className="container mx-auto py-8 bg-gradient-to-br from-indigo-50 via-teal-50 to-coral-50 min-h-screen">
      <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-teal-500 animate-fade-in">
            My Services
          </h1>
          <p className="text-gray-600 mt-1 animate-fade-in">
            Manage the services you offer to homeowners
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-500"/>
            </div>
            <Input
              type="search"
              placeholder="Search services..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/80 backdrop-blur-sm border border-gray-200 shadow-sm focus:ring-2 focus:ring-teal-400 focus:border-teal-400 text-gray-700 placeholder-gray-400 transition-all duration-300"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-4">
            <Button asChild variant="outline" className="border-teal-300 text-teal-600 hover:bg-teal-100 animate-slide-up">
              <Link href="/dashboard/provider">
                <HomeIcon className="mr-2 h-4 w-4" />
                Back to Dashboard
              </Link>
            </Button>
            <AddServiceDialog 
              onSubmit={handleAddService}
            />
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-500"></div>
          </div>
        ) : error ? (
          <div className="rounded-xl bg-red-50 p-6 shadow-sm animate-fade-in">
            <div className="flex items-center gap-3 text-red-600">
              <AlertCircle className="h-6 w-6"/>
              <div>
                <p className="font-medium text-lg">Error loading services</p>
                <p className="text-sm">{error}</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-3 border-red-300 text-red-600 hover:bg-red-100"
                  onClick={() => window.location.reload()}
                >
                  Retry
                </Button>
              </div>
            </div>
          </div>
        ) : filteredServices.length === 0 ? (
          <div className="text-center py-16 bg-white/50 backdrop-blur-sm rounded-xl shadow-sm animate-fade-in">
            <Search className="mx-auto h-12 w-12 text-teal-400"/>
            <p className="mt-3 text-lg font-medium text-gray-700">
              {searchTerm ? "No services match your search" : "No services yet"}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              {searchTerm ? "Try adjusting your search terms." : "Get started by adding your first service to attract customers."}
            </p>
            {searchTerm ? (
              <Button 
                variant="ghost" 
                className="mt-4 text-teal-600 hover:bg-teal-100"
                onClick={() => setSearchTerm("")}
              >
                Clear Search
              </Button>
            ) : (
              <AddServiceDialog 
                onSubmit={handleAddService} 
              />
            )}
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredServices.map((service) => (
              <Card 
                key={service.id} 
                className="bg-white/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 rounded-xl overflow-hidden border border-gray-100 animate-slide-up"
              >
                <div className="relative h-40 w-full bg-gray-100 group">
                  <ServiceImage 
                    src={service.image} 
                    alt={service.title}
                    className="group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                  <div className="absolute bottom-4 left-4 right-4">
                    <h3 className="text-lg font-bold text-white">{service.title}</h3>
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400"/>
                      <span className="text-sm font-medium text-white">{service.rating.toFixed(1)}</span>
                    </div>
                  </div>
                </div>
                
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-sm text-gray-500">Your Service</span>
                    <span className="text-lg font-bold text-teal-600">{service.price.toFixed(2)} Birr</span>
                  </div>
                  
                  <p className="text-sm text-gray-700 line-clamp-2 mb-3">{service.description}</p>
                  
                  <div className="flex justify-between items-center text-xs text-gray-400">
                    <span>Added {new Date(service.created_at).toLocaleDateString()}</span>
                    <span>ID: {service.id}</span>
                  </div>
                </CardContent>
                
                <CardFooter className="flex justify-between gap-2 p-4 bg-gray-50">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1 border-teal-300 text-teal-600 hover:bg-teal-100"
                    onClick={() => {
                      setEditingService(service)
                      setShowEditDialog(true)
                    }}
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </Button>
                 <Button 
                  variant="destructive" 
                  size="sm" 
                  className="flex-1"
                  onClick={() => setServiceToDelete(service)} // Just set the service to delete
                >
                  Delete
                </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>

      <EditServiceDialog />
      <DeleteServiceConfirmation />
      
      <style global jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-fade-in {
          animation: fadeIn 0.5s ease-out;
        }
        .animate-slide-up {
          animation: slideUp 0.5s ease-out;
        }
      `}</style>
    </div>
  )
}