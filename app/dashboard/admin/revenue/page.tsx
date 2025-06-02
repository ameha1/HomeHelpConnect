"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { HomeIcon, DollarSign, TrendingUp, Download } from "lucide-react"
import { Progress } from "@/components/ui/progress"

export default function AdminRevenuePage() {
  // Mock revenue data
  const monthlyRevenue = [
    { month: "January", total: 18450, platformFee: 3690, providerPayout: 14760 },
    { month: "February", total: 20120, platformFee: 4024, providerPayout: 16096 },
    { month: "March", total: 22340, platformFee: 4468, providerPayout: 17872 },
    { month: "April", total: 24567, platformFee: 4913, providerPayout: 19654 },
    { month: "May", total: 26780, platformFee: 5356, providerPayout: 21424 },
    { month: "June", total: 28950, platformFee: 5790, providerPayout: 23160 },
  ]

  const topServices = [
    { name: "Plumbing", revenue: 8750, percentage: 32 },
    { name: "Electrical", revenue: 6540, percentage: 24 },
    { name: "Cleaning", revenue: 5320, percentage: 19 },
    { name: "Landscaping", revenue: 3680, percentage: 13 },
    { name: "Painting", revenue: 2450, percentage: 9 },
    { name: "Other", revenue: 820, percentage: 3 },
  ]

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Revenue</h1>
          <p className="text-muted-foreground">Track and analyze platform revenue</p>
        </div>
        <div className="flex gap-4">
          <Button asChild variant="outline">
            <Link href="/dashboard/admin">
              <HomeIcon className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Link>
          </Button>
          <Button>
            <Download className="mr-2 h-4 w-4" />
            Export Report
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$28,950</div>
            <div className="flex items-center text-sm text-green-600">
              <TrendingUp className="mr-1 h-4 w-4" />
              <span>+8.1% from last month</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Platform Fee</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$5,790</div>
            <div className="flex items-center text-sm text-green-600">
              <TrendingUp className="mr-1 h-4 w-4" />
              <span>+8.1% from last month</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Provider Payouts</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$23,160</div>
            <div className="flex items-center text-sm text-green-600">
              <TrendingUp className="mr-1 h-4 w-4" />
              <span>+8.1% from last month</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="monthly" className="mt-8 space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="monthly">Monthly Revenue</TabsTrigger>
          <TabsTrigger value="services">Revenue by Service</TabsTrigger>
        </TabsList>
        <TabsContent value="monthly" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Monthly Revenue Breakdown</CardTitle>
              <CardDescription>Revenue statistics for the past 6 months</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-8">
                {monthlyRevenue.map((month) => (
                  <div key={month.month} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{month.month}</span>
                      </div>
                      <span className="font-bold">${month.total}</span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Platform Fee (20%)</span>
                        <span>${month.platformFee}</span>
                      </div>
                      <Progress value={20} className="h-1" />
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Provider Payouts (80%)</span>
                        <span>${month.providerPayout}</span>
                      </div>
                      <Progress value={80} className="h-1" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="services" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Revenue by Service Type</CardTitle>
              <CardDescription>Breakdown of revenue by service category</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-8">
                {topServices.map((service) => (
                  <div key={service.name} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{service.name}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold">${service.revenue}</span>
                        <span className="ml-2 text-sm text-muted-foreground">({service.percentage}%)</span>
                      </div>
                    </div>
                    <Progress value={service.percentage} className="h-2" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

