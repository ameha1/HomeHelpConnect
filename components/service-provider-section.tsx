"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Shield, Clock, Star, Hammer, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import Image from "next/image";
// import Aos from "aos";
import "aos/dist/aos.css";

const services = [
  {
    imageSrc: "/plumbing.png",
    title: "Plumbing",
    description: "Fix leaks, install fixtures, and solve all your plumbing issues",
  },
  {
    imageSrc: "/electrical.png",
    title: "Electrical",
    description: "Safe and reliable electrical repairs and installations",
  },
  {
    imageSrc: "/cleaning.png",
    title: "Cleaning",
    description: "Professional home cleaning services for a spotless living space",
  },
  {
    imageSrc: "/landscaping.png",
    title: "Landscaping",
    description: "Transform your outdoor space with expert landscaping services",
  },
  {
    imageSrc: "/painting.png",
    title: "Painting",
    description: "Interior and exterior painting to refresh your home",
  },
  {
    icon: Hammer,
    title: "Carpentry",
    description: "Custom woodwork, repairs, and installations",
  },
];

export function ServiceProviderSection() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedService, setSelectedService] = useState<string | null>(null);

  // 👇 useEffect should be inside the component
  // useEffect(() => {
  //   Aos.init({ duration: 1000 });
  // }, []);

  const handleServiceClick = async (serviceTitle: string) => {
    if (isLoading) return;

    setIsLoading(true);
    setSelectedService(serviceTitle);

    try {
      await router.push("/login");
    } catch (error) {
      console.error("Navigation error:", error);
      setIsLoading(false);
      setSelectedService(null);
    }
  };

  return (
    <div className="w-full py-12 md:py-24 lg:py-32">
      <div className="container px-4 md:px-6">
        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          <div className="space-y-2">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl" data-aos="fade-up">
              Available Services
            </h2>
            <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed" data-aos="fade-up">
              Select a service to get started
            </p>
          </div>
        </div>
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 py-12 md:grid-cols-2 lg:grid-cols-3">
          {services.map((service, index) => {
            const isSelected = selectedService === service.title;
            return (
              <Card

            
                key={index}
                className={`cursor-pointer hover:shadow-lg transition-all hover:scale-105 hover:bg-gray-300 hover:border-blue-300 hover:border-xl ${
                  isSelected ? "ring-2 ring-homehelp-600" : ""
                }`}
                onClick={() => handleServiceClick(service.title)}

                data-aos="fade-up"
              >
                <CardHeader >
                  <div className="flex items-center gap-2">
                    <div className="rounded-full bg-homehelp-100 p-2">
                      {service.imageSrc ? (
                        <Image
                          src={service.imageSrc}
                          alt={service.title}
                          width={30}
                          height={30}
                        />
                      ) : (
                        service.icon && (
                          <service.icon className="h-5 w-5 text-homehelp-600" />
                        )
                      )}
                    </div>
                    <CardTitle>{service.title}</CardTitle>
                  </div>
                  <CardDescription>{service.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    className="w-full hover:bg-blue-400"
                    variant="outline"
                    disabled={isLoading}
                  >
                    {isSelected && isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Redirecting...
                      </>
                    ) : (
                      "Select Service"
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
