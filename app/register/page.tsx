"use client"

import { useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { HomeIcon, Wrench, ArrowRight, Sparkles } from "lucide-react"

export default function RegisterPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const type = searchParams.get("type")

  useEffect(() => {
    if (type === "homeowner") {
      router.push("/register/homeowner")
    } else if (type === "provider") {
      router.push("/register/provider")
    }
  }, [type, router])

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="container relative flex h-screen flex-col items-center justify-center px-4">
        {/* Header with logo */}
        <header className="absolute top-0 w-full py-6">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
            <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-homehelp-600">
                <HomeIcon className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold tracking-tight text-gray-900">HomeHelp</span>
            </Link>
          </div>
        </header>

        {/* Main content */}
        <main className="w-full max-w-2xl">
          <div className="mx-auto flex w-full flex-col justify-center space-y-8">
            {/* Hero section */}
            <div className="flex flex-col items-center space-y-4 text-center">
              <div className="inline-flex items-center gap-2 rounded-full bg-homehelp-50 px-4 py-2 text-sm font-medium text-homehelp-600">
                <Sparkles className="h-4 w-4" />
                <span>Join our community</span>
              </div>
              <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
                Find help or grow your business
              </h1>
              <p className="max-w-md text-lg text-gray-600">
                Choose how you want to use HomeHelp to transform your home services experience
              </p>
            </div>

            {/* Cards grid */}
            <div className="grid gap-6 sm:grid-cols-2">
              {/* Homeowner card */}
              <Card className="group relative overflow-hidden transition-all hover:shadow-lg hover:border-homehelp-300">
                <div className="absolute inset-0 bg-gradient-to-br from-homehelp-50/50 to-white opacity-0 transition-opacity group-hover:opacity-100" />
                <CardHeader className="relative space-y-4">
                  <div className="flex justify-center">
                    <div className="rounded-xl bg-homehelp-100 p-4 transition-all group-hover:bg-homehelp-200">
                      <HomeIcon className="h-8 w-8 text-homehelp-600" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <CardTitle className="text-2xl font-bold text-center text-gray-900">Homeowner</CardTitle>
                    <CardDescription className="text-center text-gray-600">
                      Find and book qualified service providers
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="relative text-center text-gray-600">
                  <p>Access trusted professionals for all your home service needs</p>
                </CardContent>
                <CardFooter className="relative">
                  <Button asChild className="w-full gap-2 bg-homehelp-600 hover:bg-homehelp-700">
                    <Link href="/register/homeowner">
                      Continue as Homeowner <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </CardFooter>
              </Card>

              {/* Provider card */}
              <Card className="group relative overflow-hidden transition-all hover:shadow-lg hover:border-homehelp-300">
                <div className="absolute inset-0 bg-gradient-to-br from-homehelp-50/50 to-white opacity-0 transition-opacity group-hover:opacity-100" />
                <CardHeader className="relative space-y-4">
                  <div className="flex justify-center">
                    <div className="rounded-xl bg-homehelp-100 p-4 transition-all group-hover:bg-homehelp-200">
                      <Wrench className="h-8 w-8 text-homehelp-600" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <CardTitle className="text-2xl font-bold text-center text-gray-900">Service Provider</CardTitle>
                    <CardDescription className="text-center text-gray-600">
                      Offer your services to homeowners
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="relative text-center text-gray-600">
                  <p>Join our network of verified service providers and grow your business</p>
                </CardContent>
                <CardFooter className="relative">
                  <Button asChild className="w-full gap-2 bg-homehelp-600 hover:bg-homehelp-700">
                    <Link href="/register/provider">
                      Continue as Provider <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            </div>

            {/* Footer */}
            <p className="text-center text-gray-600">
              Already have an account?{" "}
              <Link 
                href="/login" 
                className="font-medium text-homehelp-600 underline-offset-4 hover:underline"
              >
                Sign in
              </Link>
            </p>
          </div>
        </main>
      </div>
    </div>
  )
}