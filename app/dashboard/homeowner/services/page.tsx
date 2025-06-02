"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { HomeIcon, Search, Star, MessageSquare, Send, User, Bot, MapPin, Clock, BadgeCheck, Filter, Heart } from "lucide-react";
import { BookingDialog } from "@/components/booking-dialog";
import { ServiceDetailsDialog } from "@/components/service-details-dialog";
import { useState, useEffect, useRef, useMemo } from "react";
import { useToast } from "@/components/ui/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "../../../context/auth-context";
import { createBooking } from "@/lib/api";

const ServiceImage = ({ src, alt, className = "" }: { 
  src: string, 
  alt: string, 
  className?: string 
}) => {
  const [imgSrc, setImgSrc] = useState(src);
  const [isLoading, setIsLoading] = useState(true);

  return (
    <div className={`relative w-full h-full overflow-hidden ${className}`}>
      {isLoading && (
        <div className="absolute inset-0 bg-gradient-to-br from-gray-200 to-gray-300 animate-pulse" />
      )}
      <Image
        src={imgSrc || '/placeholder-service.jpg'}
        alt={alt}
        fill
        className={`object-cover transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
        onError={() => setImgSrc('/placeholder-service.jpg')}
        onLoad={() => setIsLoading(false)}
        unoptimized={imgSrc?.startsWith('/')}
      />
    </div>
  );
};

interface Service {
  id: string;
  title: string;
  description: string;
  price: number;
  provider_name: string;
  rating: number;
  image: string;
  is_verified?: boolean;
  years_experience?: number;
  address?: string;
  services?: string[];
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  results?: any[];
}

export default function FindServicesPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [allServices, setAllServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [priceRange, setPriceRange] = useState([0, 500]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [sortOption, setSortOption] = useState('recommended');

  // Apply filters and sorting to services
  const filteredServices = useMemo(() => {
    let result = [...allServices];
    
    // Apply price filter
    result = result.filter(service => 
      service.price >= priceRange[0] && service.price <= priceRange[1]
    );
    
    // Apply category filter if any categories are selected
    if (selectedCategories.length > 0) {
      result = result.filter(service => 
        service.services?.some(serviceType => 
          selectedCategories.some(cat => 
            serviceType.toLowerCase().includes(cat.toLowerCase())
          )
        )
      );
    }
    
    // Apply sorting
    switch (sortOption) {
      case 'rating':
        result.sort((a, b) => b.rating - a.rating);
        break;
      case 'price':
        result.sort((a, b) => a.price - b.price);
        break;
      case 'recommended':
      default:
        // Default sorting (could be by relevance, popularity, etc.)
        result.sort((a, b) => {
          // Prioritize verified providers
          const verifiedScore = (b.is_verified ? 1 : 0) - (a.is_verified ? 1 : 0);
          if (verifiedScore !== 0) return verifiedScore;
          
          // Then by rating
          const ratingScore = b.rating - a.rating;
          if (ratingScore !== 0) return ratingScore;
          
          // Then by experience
          return (b.years_experience || 0) - (a.years_experience || 0);
        });
        break;
    }
    
    return result;
  }, [allServices, priceRange, selectedCategories, sortOption]);

  useEffect(() => {
    setChatMessages([
      {
        role: 'assistant',
        content: "Hello! I'm your HomeHelp assistant. How can I help you find services today?",
        timestamp: new Date()
      }
    ]);
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const fetchServices = async (query = "") => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/recommendations/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: query || "top service providers",
        }),
      });

      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }

      const data = await response.json();
      
      if (data.results) {
        const transformedServices = transformServiceData(data.results);
        setAllServices(transformedServices);
      } else if (data.response_type === "no_data") {
        setAllServices([]);
        toast({
          title: "No services found",
          description: data.response,
          variant: "destructive",
        });
      } else {
        throw new Error(data.response || "No service data available");
      }
    } catch (err) {
      console.error("Error fetching services:", err);
      setError(err instanceof Error ? err.message : "An unknown error occurred");
      toast({
        title: "Error loading services",
        description: "Showing limited sample data instead",
        variant: "destructive",
      });
      setAllServices(getFallbackServices());
    } finally {
      setIsLoading(false);
    }
  };

  const transformServiceData = (results: any[]): Service[] => {
    return results.map((service) => ({
      id: service.id?.toString() || Math.random().toString(36).substring(2, 9),
      title: service.title || "Professional Services",
      description: service.description || "Professional service provider",
      price: service.price || 50,
      provider_name: service.provider_name || "Verified Provider",
      rating: service.rating || 0,
      image: service.image, 
      is_verified: service.is_verified,
      years_experience: service.years_experience,
      address: service.address,
      services: service.services || []
    }));
  };

  const getFallbackServices = (): Service[] => {
    return [
      {
        id: "fallback-1",
        title: "General Handyman Services",
        description: "Professional handyman services for all your home needs.",
        price: 60,
        provider_name: "Verified Provider",
        rating: 4.2,
        image: "/service/handyman-service.png",
        is_verified: true,
        years_experience: 5,
        services: ["Handyman", "Repairs"]
      },
      {
        id: "fallback-2",
        title: "Professional Plumbing",
        description: "Expert plumbing services for homes and businesses.",
        price: 80,
        provider_name: "Plumbing Experts",
        rating: 4.5,
        image: "/service/plumbing-service.png",
        is_verified: true,
        years_experience: 8,
        services: ["Plumbing", "Repairs"]
      },
      {
        id: "fallback-3",
        title: "Electrical Services",
        description: "Certified electricians for all your electrical needs.",
        price: 75,
        provider_name: "Electric Solutions",
        rating: 4.3,
        image: "/service/electrical-service.png",
        is_verified: false,
        years_experience: 3,
        services: ["Electrical", "Installation"]
      }
    ];
  };

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: chatInput,
      timestamp: new Date()
    };
    setChatMessages(prev => [...prev, userMessage]);
    setChatInput("");
    setIsChatLoading(true);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/recommendations/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: chatInput,
          history: chatMessages.map(msg => ({
            role: msg.role,
            content: msg.content
          }))
        }),
      });

      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }

      const data = await response.json();

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
        results: data.results
      };
      setChatMessages(prev => [...prev, assistantMessage]);

      if (data.results && data.results.length > 0) {
        const transformedServices = transformServiceData(data.results);
        setAllServices(transformedServices);
      }
    } catch (err) {
      console.error("Error in chat:", err);
      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: "Sorry, I encountered an error processing your request. Please try again.",
        timestamp: new Date()
      }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      fetchServices(searchQuery);
    } else {
      fetchServices();
    }
  };

  const handleCreateBooking = async (bookingData: {
    service_id: string;
    scheduled_date: string;
    scheduled_time: string;
    address: string;
    notes?: string;
  }) => {
    try {
      await createBooking(bookingData);
      toast({
        title: "Booking confirmed!",
        description: "Your booking has been successfully scheduled.",
        variant: "default",
      });
    } catch (err) {
      toast({
        title: "Booking failed",
        description: err instanceof Error ? err.message : "Failed to create booking",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  return (
    <div className="container mx-auto px-4 py-8 relative">
      {/* Hero Section */}
      <div className="mb-12 text-center">
        <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-600 mb-3">
          Find Your Perfect Service Provider
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Discover trusted professionals for all your home needs. Book with confidence.
        </p>
      </div>

      {/* Search and Filter Bar */}
      <div className="mb-8 bg-white rounded-xl shadow-sm p-4 border">
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <form onSubmit={handleSearch} className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input 
              type="search" 
              placeholder="Search for services (e.g., 'plumbers', 'electricians')" 
              className="pl-10 py-5 text-base shadow-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </form>
          
          <div className="flex gap-2 w-full md:w-auto">
            <Button 
              variant="outline" 
              className="gap-2"
              onClick={() => setFiltersOpen(!filtersOpen)}
            >
              <Filter className="h-4 w-4" />
              Filters
            </Button>
            
            <Button 
              onClick={() => setChatOpen(!chatOpen)}
              variant={chatOpen ? "default" : "outline"}
              className="gap-2"
            >
              <MessageSquare className="h-4 w-4" />
              {chatOpen ? "Hide Assistant" : "Ask Assistant"}
            </Button>
          </div>
        </div>

        {/* Filters Panel */}
        {filtersOpen && (
          <div className="mt-4 pt-4 border-t grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h3 className="font-medium mb-2">Price Range</h3>
              <div className="flex items-center gap-4">
                <Input 
                  type="number" 
                  placeholder="Min" 
                  value={priceRange[0]}
                  onChange={(e) => setPriceRange([Number(e.target.value), priceRange[1]])}
                  min={0}
                />
                <span className="text-muted-foreground">to</span>
                <Input 
                  type="number" 
                  placeholder="Max" 
                  value={priceRange[1]}
                  onChange={(e) => setPriceRange([priceRange[0], Number(e.target.value)])}
                  min={priceRange[0]}
                />
              </div>
            </div>
            
            <div>
              <h3 className="font-medium mb-2">Categories</h3>
              <div className="flex flex-wrap gap-2">
                {['Plumbing', 'Electrical', 'Cleaning', 'Painting', 'Handyman'].map((cat) => (
                  <Badge 
                    key={cat}
                    variant={selectedCategories.includes(cat) ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => setSelectedCategories(prev => 
                      prev.includes(cat) 
                        ? prev.filter(c => c !== cat) 
                        : [...prev, cat]
                    )}
                  >
                    {cat}
                  </Badge>
                ))}
              </div>
            </div>
            
            <div>
              <h3 className="font-medium mb-2">Sort By</h3>
              <div className="flex gap-2">
                <Button
                  variant={sortOption === 'recommended' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSortOption('recommended')}
                >
                  Recommended
                </Button>
                <Button
                  variant={sortOption === 'rating' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSortOption('rating')}
                >
                  Highest Rating
                </Button>
                <Button
                  variant={sortOption === 'price' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSortOption('price')}
                >
                  Price
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Chat Assistant Panel */}
      {chatOpen && (
        <div className="fixed bottom-6 right-6 w-full max-w-md bg-white rounded-xl shadow-xl border z-50 flex flex-col h-[500px] overflow-hidden">
          <div className="p-4 border-b bg-primary text-primary-foreground rounded-t-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              <h3 className="font-semibold">Service Finder Assistant</h3>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-primary-foreground hover:bg-primary/80"
              onClick={() => setChatOpen(false)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6 6 18"/>
                <path d="m6 6 12 12"/>
              </svg>
            </Button>
          </div>
          
          <div 
            ref={chatContainerRef}
            className="flex-1 overflow-y-auto p-4 space-y-4"
          >
            {chatMessages.map((message, index) => (
              <div 
                key={index} 
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[80%] rounded-lg p-3 ${message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <Avatar className="h-6 w-6">
                      {message.role === 'user' ? (
                        <AvatarFallback className="bg-primary-foreground text-primary">
                          <User className="h-4 w-4" />
                        </AvatarFallback>
                      ) : (
                        <AvatarFallback className="bg-muted-foreground text-muted">
                          <Bot className="h-4 w-4" />
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <span className="text-xs font-medium">
                      {message.role === 'user' ? 'You' : 'Assistant'}
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap">{message.content}</p>
                  {message.results && message.results.length > 0 && (
                    <div className="mt-2 text-xs">
                      <Badge variant="secondary" className="mb-1">
                        Found {message.results.length} services
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isChatLoading && (
              <div className="flex justify-start">
                <div className="max-w-[80%] rounded-lg p-3 bg-muted">
                  <div className="flex items-center gap-2">
                    <div className="animate-pulse rounded-full h-2 w-2 bg-muted-foreground" />
                    <div className="animate-pulse rounded-full h-2 w-2 bg-muted-foreground" />
                    <div className="animate-pulse rounded-full h-2 w-2 bg-muted-foreground" />
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <form onSubmit={handleChatSubmit} className="p-4 border-t">
            <div className="relative">
              <Input
                type="text"
                placeholder="Ask about services (e.g. 'Find plumbers near me')"
                className="pr-10"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                disabled={isChatLoading}
              />
              <Button
                type="submit"
                size="icon"
                variant="ghost"
                className="absolute right-0 top-0 h-full px-3"
                disabled={!chatInput.trim() || isChatLoading}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <Card key={i} className="overflow-hidden hover:shadow-md transition-shadow">
              <Skeleton className="aspect-video w-full rounded-b-none" />
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2 mt-2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-4/5" />
              </CardContent>
              <CardFooter className="flex justify-between">
                <Skeleton className="h-9 w-24" />
                <Skeleton className="h-9 w-24" />
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-600 rounded-lg">
          <p className="font-semibold">Error loading services:</p>
          <p>{error}</p>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredServices.length === 0 && (
        <div className="text-center py-12">
          <div className="mx-auto max-w-md">
            <div className="w-24 h-24 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <Search className="h-12 w-12 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-medium">No services found</h3>
            <p className="text-muted-foreground mt-2">
              Try adjusting your filters or ask the assistant for help
            </p>
            <Button 
              variant="outline" 
              className="mt-4 gap-2"
              onClick={() => setChatOpen(true)}
            >
              <MessageSquare className="h-4 w-4" />
              Ask Assistant
            </Button>
          </div>
        </div>
      )}

      {/* Service Cards Grid */}
      {!isLoading && filteredServices.length > 0 && (
        <>
          <div className="mb-4 flex justify-between items-center">
            <h2 className="text-xl font-semibold">
              {searchQuery ? `Results for "${searchQuery}"` : 'Recommended Services'}
              <span className="text-muted-foreground ml-2">({filteredServices.length})</span>
            </h2>
            <div className="text-sm text-muted-foreground">
              Sorted by: {sortOption === 'recommended' ? 'Recommended' : 
                         sortOption === 'rating' ? 'Highest Rating' : 'Price'}
            </div>
          </div>
          
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredServices.map((service) => (
              <Card key={service.id} className="group overflow-hidden hover:shadow-md transition-shadow duration-300">
                <div className="relative h-48 w-full bg-gray-100 overflow-hidden">
                  <ServiceImage
                    src={`${process.env.NEXT_PUBLIC_API_BASE_URL}${service.image}`}
                    alt={service.title}
                    className="group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  
                  {/* Favorite Button */}
                  {/* <button className="absolute top-3 right-3 p-2 bg-white/90 rounded-full hover:bg-white transition-colors">
                    <Heart className="h-5 w-5 text-gray-600 hover:text-red-500" />
                  </button> */}
                  
                  {/* Verified Badge */}
                  {service.is_verified && (
                    <div className="absolute top-3 left-3 bg-green-500 text-white text-xs px-2 py-1 rounded-full flex items-center shadow-sm">
                      <BadgeCheck className="h-3 w-3 mr-1" />
                      Verified
                    </div>
                  )}
                  
                  {/* Bottom Text */}
                  <div className="absolute bottom-4 left-4 right-4">
                    <h3 className="text-lg font-bold text-white">{service.title}</h3>
                    <p className="text-sm text-white/90">{service.provider_name}</p>
                  </div>
                </div>
                
                <CardContent className="p-4">
                  <p className="text-sm text-gray-700 line-clamp-2 mb-3">
                    {service.description}
                  </p>
                  
                  <div className="space-y-2">
                    {service.address && (
                      <div className="flex items-start gap-2 text-sm">
                        <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <span className="truncate">{service.address}</span>
                      </div>
                    )}
                    
                    {service.years_experience && (
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>{service.years_experience} years experience</span>
                      </div>
                    )}
                    
                    {service.services && service.services.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {service.services.slice(0, 3).map((serviceType, index) => (
                          <Badge 
                            key={index} 
                            variant="secondary" 
                            className="text-xs hover:bg-primary/10"
                          >
                            {serviceType}
                          </Badge>
                        ))}
                        {service.services.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{service.services.length - 3} more
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between mt-4">
                    <span className="text-lg font-bold text-primary">
                      {service.price.toFixed(2)} Birr
                      <span className="text-xs text-muted-foreground font-normal"> / service</span>
                    </span>
                    <div className="flex items-center gap-1 bg-primary/10 px-2 py-1 rounded-full">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span className="text-sm font-medium">
                        {service.rating.toFixed(1)}
                      </span>
                    </div>
                  </div>
                </CardContent>
                
                <CardFooter className="flex justify-between gap-2 p-4 border-t">
                  <ServiceDetailsDialog service={{
                    ...service,
                    price: service.price.toString()
                  }} />
                  <BookingDialog 
                    serviceId={service.id}
                    serviceTitle={service.title}
                    providerName={service.provider_name}
                    homeownerName={user?.email?.split('@')[0] || "Homeowner"}
                    onBookingSuccess={handleCreateBooking}
                  />
                </CardFooter>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}