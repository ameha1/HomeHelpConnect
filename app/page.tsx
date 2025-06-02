"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { HomeIcon, ArrowRight, Loader2, MessageCircle, X } from "lucide-react";
import { ServiceProviderSection } from "@/components/service-provider-section";
import Aos from "aos";
import "aos/dist/aos.css";

export default function Home() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [loadingAction, setLoadingAction] = useState<'login' | 'register' | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<Array<{text: string, sender: 'user' | 'bot'}>>([
    {text: "Hi! I'm your HomeHelp assistant. How can I help you today?", sender: 'bot'}
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleNavigation = async (path: string, action: 'login' | 'register') => {
    if (isLoading) return;
    setIsLoading(true);
    setLoadingAction(action);

    try {
      await router.push(path);
    } catch (error) {
      console.error("Navigation error:", error);
      setIsLoading(false);
      setLoadingAction(null);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isTyping) return;
    
    // Add user message
    const userMessage = {text: inputValue, sender: 'user' as const};
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);
    
    try {
      // Call API endpoint
      const response = await fetch('http://localhost:8000/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: inputValue }),
      });

      if (!response.ok) {
        throw new Error('Failed to get bot response');
      }

      const data = await response.json();
      const botResponse = {text: data.response, sender: 'bot' as const};
      setMessages(prev => [...prev, botResponse]);
    } catch (error) {
      console.error('Error communicating with chatbot:', error);
      const errorResponse = {text: "Sorry, I'm having trouble responding right now. Please try again later.", sender: 'bot' as const};
      setMessages(prev => [...prev, errorResponse]);
    } finally {
      setIsTyping(false);
    }
  };

  // Scroll to bottom of chat when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    Aos.init({ duration: 1000 });
  }, []);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <HomeIcon className="h-6 w-6 text-homehelp-600" />
            <span className="text-xl font-bold bg-gradient-to-r from-homehelp-600 to-homehelp-400 bg-clip-text text-transparent">
              HomeHelp
            </span>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <Link href="#services" className="text-sm font-medium hover:text-homehelp-600 transition-colors">
              Services
            </Link>
            <Link href="#how-it-works" className="text-sm font-medium hover:text-homehelp-600 transition-colors">
              How It Works
            </Link>
            <Link href="#testimonials" className="text-sm font-medium hover:text-homehelp-600 transition-colors">
              Testimonials
            </Link>
            <Button 
              variant="ghost" 
              className="text-sm font-medium hover:text-homehelp-600 transition-colors"
              onClick={() => handleNavigation("/login", "login")}
              disabled={isLoading}
            >
              {loadingAction === "login" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Logging in...
                </>
              ) : (
                "Log In"
              )}
            </Button>
            <Button 
              onClick={() => handleNavigation("/register", "register")}
              disabled={isLoading}
              className="bg-gradient-to-r from-homehelp-600 to-homehelp-400 hover:from-homehelp-700 hover:to-homehelp-500 text-white"
            >
              {loadingAction === "register" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing up...
                </>
              ) : (
                "Sign Up"
              )}
            </Button>
          </nav>
          <Button variant="outline" size="icon" className="md:hidden">
            <span className="sr-only">Toggle menu</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-6 w-6"
            >
              <line x1="4" x2="20" y1="12" y2="12" />
              <line x1="4" x2="20" y1="6" y2="6" />
              <line x1="4" x2="20" y1="18" y2="18" />
            </svg>
          </Button>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="w-full py-12 md:py-24 lg:py-32 bg-gradient-to-b from-white to-homehelp-50 relative overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-homehelp-100 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
            <div className="absolute top-0 right-1/4 w-96 h-96 bg-homehelp-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
            <div className="absolute bottom-0 left-1/2 w-96 h-96 bg-homehelp-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
          </div>
          
          <div className="container px-4 md:px-6 relative z-10">
            <div className="grid gap-6 lg:grid-cols-2 lg:gap-12 xl:grid-cols-2">
              <div className="flex flex-col justify-center space-y-4">
                <div className="space-y-2">
                  <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none" data-aos="fade-up">
                    <span className="bg-gradient-to-r from-homehelp-600 to-homehelp-400 bg-clip-text text-transparent">
                      Find Trusted Home Service Providers
                    </span>
                  </h1>
                  <p className="max-w-[600px] text-muted-foreground md:text-xl" data-aos="fade-up" data-aos-delay="100">
                    Connect with verified professionals for all your home needs. Quality service at your fingertips.
                  </p>
                </div>
                <div className="flex flex-col gap-2 min-[400px]:flex-row" data-aos="fade-up" data-aos-delay="200">
                  <Button 
                    size="lg" 
                    className="gap-1 scale-125 bg-gradient-to-r from-homehelp-600 to-homehelp-400 hover:from-homehelp-700 hover:to-homehelp-500"
                    onClick={() => handleNavigation("/register/homeowner", "register")}
                    disabled={isLoading}   
                  >
                    {loadingAction === "register" ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Signing up...
                      </>
                    ) : (
                      <>
                        I am Homeowner<ArrowRight className="h-4 w-4 hover:scale-105" />
                      </>
                    )}
                  </Button>
                  <Button 
                    variant="outline" 
                    size="lg"
                    onClick={() => handleNavigation("/register/provider", "register")}
                    disabled={isLoading}
                    className="scale-125 border-homehelp-600 text-homehelp-600 hover:bg-homehelp-50"
                  >
                    {loadingAction === "register" ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Signing up...
                      </>
                    ) : (
                      "Become a Provider"
                    )}
                  </Button>
                </div>
                
                <div className="flex items-center gap-4 pt-4" data-aos="fade-up" data-aos-delay="300">
                  <div className="flex -space-x-2">
                    {[1, 2, 3, 4].map((item) => (
                      <img
                        key={item}
                        className="inline-block h-10 w-10 rounded-full ring-2 ring-white"
                        src={`https://randomuser.me/api/portraits/${item % 2 === 0 ? 'women' : 'men'}/${item + 80}.jpg`}
                        alt="Happy Ethiopian customer"
                      />
                    ))}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <p>Trusted by 10,000+ homeowners</p>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <svg key={star} className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                      <span>4.9/5 from 2,500+ reviews</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-center" data-aos="fade-left">
                <img
                  alt="HomeHelp Services"
                  className="rounded-xl object-cover shadow-xl border border-gray-200"
                  height="550"
                  src="/coverpage.png?height=550&width=550"
                  width="550"
                />
              </div>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section id="how-it-works" className="w-full py-12 md:py-24 lg:py-32 bg-white">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center mb-12">
              <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl" data-aos="fade-up">
                How <span className="text-homehelp-600">HomeHelp</span> Works
              </h2>
              <p className="max-w-[700px] text-muted-foreground md:text-lg" data-aos="fade-up" data-aos-delay="100">
                Simple steps to get the help you need for your home
              </p>
            </div>
            
            <div className="grid gap-8 md:grid-cols-3">
              {[
                {
                  title: "Browse Services",
                  description: "Explore our wide range of home services from verified professionals.",
                  icon: (
                    <svg className="w-10 h-10 text-homehelp-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  )
                },
                {
                  title: "Book Instantly",
                  description: "Select a service provider and book an appointment at your convenience.",
                  icon: (
                    <svg className="w-10 h-10 text-homehelp-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  )
                },
                {
                  title: "Enjoy Quality Service",
                  description: "Relax while professionals take care of your home needs.",
                  icon: (
                    <svg className="w-10 h-10 text-homehelp-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )
                }
              ].map((item, index) => (
                <div 
                  key={index} 
                  className="flex flex-col items-center text-center p-6 rounded-xl bg-homehelp-50 border border-homehelp-100 hover:shadow-lg transition-all"
                  data-aos="fade-up"
                  data-aos-delay={index * 100}
                >
                  <div className="p-3 mb-4 bg-white rounded-full shadow-sm">
                    {item.icon}
                  </div>
                  <h3 className="text-xl font-bold mb-2">{item.title}</h3>
                  <p className="text-muted-foreground">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Service List Section */}
        <ServiceProviderSection />

        {/* Testimonials Section */}
        <section id="testimonials" className="w-full py-12 md:py-24 lg:py-32 bg-homehelp-50">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center mb-12">
              <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl" data-aos="fade-up">
                What Our <span className="text-homehelp-600">Customers</span> Say
              </h2>
              <p className="max-w-[700px] text-muted-foreground md:text-lg" data-aos="fade-up" data-aos-delay="100">
                Don't just take our word for it - hear from our satisfied customers
              </p>
            </div>
            
            <div className="grid gap-8 md:grid-cols-3">
              {[
                {
                  name: "Abebe Kebede",
                  role: "Homeowner",
                  quote: "Found a fantastic plumber within minutes who fixed my leak the same day. Amazing service!",
                  rating: 5
                },
                {
                  name: "Tadesse Alemu",
                  role: "Service Provider",
                  quote: "HomeHelp has connected me with so many great clients. It's transformed my business.",
                  rating: 5
                },
                {
                  name: "Mekdes Haile",
                  role: "Homeowner",
                  quote: "The electrician I found through HomeHelp was professional, punctual, and reasonably priced.",
                  rating: 4
                }
              ].map((testimonial, index) => (
                <div 
                  key={index} 
                  className="flex flex-col p-6 rounded-xl bg-white border border-gray-200 hover:shadow-lg transition-all"
                  data-aos="fade-up"
                  data-aos-delay={index * 100}
                >
                  <div className="flex items-center mb-4">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <svg 
                        key={star} 
                        className={`w-5 h-5 ${star <= testimonial.rating ? 'text-yellow-400' : 'text-gray-300'}`} 
                        fill="currentColor" 
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <blockquote className="text-lg mb-6">
                    "{testimonial.quote}"
                  </blockquote>
                  <div className="mt-auto flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-homehelp-200 flex items-center justify-center text-homehelp-800 font-bold">
                      {testimonial.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium">{testimonial.name}</p>
                      <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="w-full py-12 md:py-24 lg:py-32 bg-gradient-to-r from-homehelp-600 to-homehelp-400 text-white">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl" data-aos="fade-up">
                  Ready to Get Started?
                </h2>
                <p className="max-w-[900px] md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed" data-aos="fade-up" data-aos-delay="100">
                  Join thousands of satisfied homeowners and service providers today
                </p>
              </div>
              <div className="flex flex-col gap-2 min-[400px]:flex-row" data-aos="fade-up" data-aos-delay="200">
                <Button 
                  size="lg" 
                  variant="secondary" 
                  className="gap-1 hover:scale-105 transition-transform"
                  onClick={() => handleNavigation("/register/homeowner", "register")}
                  disabled={isLoading}
                >
                  {loadingAction === "register" ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing up...
                    </>
                  ) : (
                    <>
                      I am Homeowner <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="text-black border-white hover:bg-white hover:text-homehelp-600 hover:scale-105 transition-transform"
                  onClick={() => handleNavigation("/register/provider", "register")}
                  disabled={isLoading}
                >
                  {loadingAction === "register" ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing up...
                    </>
                  ) : (
                    "Become a Provider"
                  )}
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="w-full border-t py-6 md:py-0 bg-white">
        <div className="container flex flex-col items-center justify-between gap-4 md:h-24 md:flex-row">
          <div className="flex flex-col items-center gap-4 px-8 md:flex-row md:gap-2 md:px-0">
            <HomeIcon className="h-6 w-6 text-homehelp-600" />
            <span className="text-xl font-bold bg-gradient-to-r from-homehelp-600 to-homehelp-400 bg-clip-text text-transparent">
              HomeHelp
            </span>
            <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
              &copy; {new Date().getFullYear()} HomeHelp. All rights reserved.
            </p>
          </div>
          <div className="flex gap-4">
            <Link href="#" className="text-sm text-muted-foreground hover:text-homehelp-600">
              Terms
            </Link>
            <Link href="#" className="text-sm text-muted-foreground hover:text-homehelp-600">
              Privacy
            </Link>
            <Link href="#" className="text-sm text-muted-foreground hover:text-homehelp-600">
              Contact
            </Link>
          </div>
        </div>
      </footer>

      {/* Chatbot Assistant */}
      <div className="fixed bottom-6 right-6 z-50">
        {chatOpen ? (
          <div className="w-80 h-[500px] bg-white rounded-xl shadow-xl border border-gray-200 flex flex-col overflow-hidden transition-all duration-300 ease-in-out">
            <div className="bg-homehelp-600 text-white p-4 flex justify-between items-center">
              <h3 className="font-bold">HomeHelp Assistant</h3>
              <button 
                onClick={() => setChatOpen(false)}
                className="text-white hover:text-gray-200 transition-colors"
                aria-label="Close chat"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="flex-1 p-4 overflow-y-auto">
              {messages.map((message, index) => (
                <div 
                  key={index} 
                  className={`mb-4 flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div 
                    className={`max-w-[80%] px-4 py-2 rounded-lg ${message.sender === 'user' 
                      ? 'bg-homehelp-600 text-white rounded-tr-none' 
                      : 'bg-gray-100 text-gray-800 rounded-tl-none'}`}
                  >
                    {message.text}
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex justify-start mb-4">
                  <div className="bg-gray-100 text-gray-800 px-4 py-2 rounded-lg rounded-tl-none">
                    <div className="flex space-x-2">
                      <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce"></div>
                      <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce delay-100"></div>
                      <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce delay-200"></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
            
            <form onSubmit={handleSendMessage} className="p-4 border-t">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Type your message..."
                  className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-homehelp-400"
                  disabled={isTyping}
                />
                <Button 
                  type="submit"
                  className="bg-homehelp-600 hover:bg-homehelp-700"
                  disabled={!inputValue.trim() || isTyping}
                >
                  Send
                </Button>
              </div>
            </form>
          </div>
        ) : (
          <button
            onClick={() => setChatOpen(true)}
            className="w-14 h-14 rounded-full bg-homehelp-600 text-white shadow-lg flex items-center justify-center hover:bg-homehelp-700 transition-all hover:scale-110"
            aria-label="Open chat"
          >
            <MessageCircle className="h-6 w-6" />
          </button>
        )}
      </div>
    </div>
    
  );
}
