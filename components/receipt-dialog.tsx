"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { Download, Printer } from "lucide-react"

interface ReceiptDialogProps {
  bookingId: string
  serviceTitle: string
  provider: string
  date: string
  price: string
}

export function ReceiptDialog({ bookingId, serviceTitle, provider, date, price }: ReceiptDialogProps) {
  const [isOpen, setIsOpen] = useState(false)

  const handlePrint = () => {
    window.print()
  }

  const handleDownload = () => {
    alert("Receipt downloaded")
    setIsOpen(false)
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          View Receipt
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Receipt</DialogTitle>
          <DialogDescription>Service receipt for {serviceTitle}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="flex justify-between">
            <div>
              <h3 className="font-bold text-lg">HomeHelp</h3>
              <p className="text-sm text-muted-foreground">Receipt #{bookingId}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium">Date: {date}</p>
              <p className="text-sm text-muted-foreground">Invoice #INV-{bookingId}</p>
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <div className="flex justify-between">
              <p className="font-medium">Service</p>
              <p className="font-medium">Amount</p>
            </div>
            <div className="flex justify-between">
              <p>{serviceTitle}</p>
              <p>{price}</p>
            </div>
            <div className="flex justify-between text-sm text-muted-foreground">
              <p>Service Provider: {provider}</p>
              <p></p>
            </div>
          </div>

          <Separator />

          <div className="space-y-1">
            <div className="flex justify-between">
              <p>Subtotal</p>
              <p>{price}</p>
            </div>
            <div className="flex justify-between">
              <p>Tax (8%)</p>
              <p>ETB {(Number.parseFloat(price.replace("ETB ", "")) * 0.08).toFixed(2)}</p>
            </div>
            <div className="flex justify-between font-bold">
              <p>Total</p>
              <p>ETB {(Number.parseFloat(price.replace("ETB ", "")) * 1.08).toFixed(2)}</p>
            </div>
          </div>

          <div className="rounded-lg bg-muted p-4 text-center text-sm">
            <p>Thank you for using HomeHelp!</p>
            <p className="text-muted-foreground">If you have any questions, please contact support@homehelp.com</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
          <Button onClick={handleDownload}>
            <Download className="mr-2 h-4 w-4" />
            Download PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

