"use client"

import { useState, useRef } from "react"
import { Plus, Upload, ChevronDown } from "lucide-react"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const HOME_SERVICES = [
  "Plumbing",
  "Electrical",
  "HVAC",
  "Carpentry",
  "Painting",
  "Cleaning",
  "Landscaping",
  "Handyman",
  "Appliance Repair",
  "Roofing",
  "Flooring",
  "Window Installation",
  "Door Installation",
  "Pest Control",
  "Masonry",
  "Concrete Work",
  "Drywall Installation",
  "Tile Work",
  "Home Security Installation",
  "Smart Home Installation",
  "Furniture Assembly",
  "Moving Assistance",
  "Junk Removal",
  "Pressure Washing",
  "Gutter Cleaning",
  "Chimney Sweep",
  "Water Damage Restoration",
  "Mold Remediation",
  "Home Inspection",
  "Interior Design",
  "Home Organization",
  "Pool Maintenance",
  "Deck Building",
  "Fence Installation",
  "Garage Door Repair",
  "Window Cleaning",
  "Carpet Cleaning",
  "Upholstery Cleaning",
  "Air Duct Cleaning",
  "Solar Panel Installation"
];

interface AddServiceDialogProps {
  onSubmit: (data: {
    title: string;
    description: string;
    price: string;
    image?: File;
  }) => Promise<void>;
}

export function AddServiceDialog({ onSubmit }: AddServiceDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [price, setPrice] = useState("")
  const [image, setImage] = useState<File | null>(null)
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [customTitle, setCustomTitle] = useState("")
  const [showCustomInput, setShowCustomInput] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setImage(file)
      const previewUrl = URL.createObjectURL(file)
      setPreviewImage(previewUrl)
    }
  }

  const triggerFileInput = () => {
    fileInputRef.current?.click()
  }

  const resetForm = () => {
    setTitle("")
    setDescription("")
    setPrice("")
    setImage(null)
    setPreviewImage(null)
    setCustomTitle("")
    setShowCustomInput(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleTitleChange = (value: string) => {
    if (value === "custom") {
      setShowCustomInput(true)
      setTitle("")
    } else {
      setShowCustomInput(false)
      setTitle(value)
    }
  }

  const handleSubmit = async () => {
    const finalTitle = showCustomInput ? customTitle : title
    if (!finalTitle || !description || !price) return
    setIsSubmitting(true)

    try {
      await onSubmit({
        title: finalTitle,
        description,
        price,
        image: image || undefined
      })

      toast({
        title: "Success",
        description: "Service created successfully!",
      })

      setIsOpen(false)
      resetForm()
    } catch (error) {
      console.error("Error creating service:", error)
      toast({
        title: "Error",
        description: "Failed to create service. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1">
          <Plus className="h-4 w-4" /> Add Service
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Service</DialogTitle>
          <DialogDescription>Create a new service to offer to homeowners</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="title">Service Title*</Label>
            <Select onValueChange={handleTitleChange} value={title}>
              <SelectTrigger>
                <SelectValue placeholder="Select a service type" />
              </SelectTrigger>
              <SelectContent>
                {HOME_SERVICES.map((service) => (
                  <SelectItem key={service} value={service}>
                    {service}
                  </SelectItem>
                ))}
                <SelectItem value="custom">Other (Specify)</SelectItem>
              </SelectContent>
            </Select>
            {showCustomInput && (
              <Input
                id="custom-title"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                placeholder="Enter custom service title"
                className="mt-2"
                required
              />
            )}
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="description">Description*</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your service in detail..."
              rows={4}
              required
            />
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="price">Price*</Label>
            <Input
              id="price"
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="e.g., 150"
              required
            />
          </div>
          
          <div className="grid gap-2">
            <Label>Service Image</Label>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageChange}
              accept="image/*"
              className="hidden"
            />
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                type="button"
                onClick={triggerFileInput}
                className="gap-2"
              >
                <Upload className="h-4 w-4" />
                {image ? "Change Image" : "Upload Image"}
              </Button>
              {previewImage && (
                <div className="relative h-16 w-16">
                  <img
                    src={previewImage}
                    alt="Preview"
                    className="h-full w-full rounded-md object-cover"
                    onLoad={() => URL.revokeObjectURL(previewImage)}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
   
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={
              (!title && !customTitle) || 
              !description || 
              !price || 
              isSubmitting ||
              (showCustomInput && !customTitle)
            }
          >
            {isSubmitting ? "Adding..." : "Add Service"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}