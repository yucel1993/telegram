"use client"

import { useState, useCallback } from "react"
import Cropper from "react-easy-crop"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ZoomIn, ZoomOut, RotateCw } from "lucide-react"

interface ImageCropperProps {
  image: string
  onCropComplete: (croppedImage: string) => void
  onCancel: () => void
  aspectRatio?: number
}

export default function ImageCropper({ image, onCropComplete, onCancel, aspectRatio = 1 }: ImageCropperProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null)

  const onCropChange = useCallback((newCrop: { x: number; y: number }) => {
    setCrop(newCrop)
  }, [])

  const onZoomChange = useCallback((newZoom: number) => {
    setZoom(newZoom)
  }, [])

  const onRotationChange = useCallback(() => {
    setRotation((prevRotation) => (prevRotation + 90) % 360)
  }, [])

  const onCropCompleteCallback = useCallback((_: any, croppedAreaPixelsData: any) => {
    setCroppedAreaPixels(croppedAreaPixelsData)
  }, [])

  const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const image = new Image()
      image.addEventListener("load", () => resolve(image))
      image.addEventListener("error", (error) => reject(error))
      image.crossOrigin = "anonymous"
      image.src = url
    })

  const getCroppedImg = async (imageSrc: string, pixelCrop: any, rotation = 0): Promise<string> => {
    const image = await createImage(imageSrc)
    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")

    if (!ctx) {
      throw new Error("No 2d context")
    }

    // Set canvas size to match the final image size
    const maxSize = Math.max(image.width, image.height)
    canvas.width = pixelCrop.width
    canvas.height = pixelCrop.height

    // Translate canvas context to a central location to allow rotating and flipping around the center
    ctx.translate(pixelCrop.width / 2, pixelCrop.height / 2)
    ctx.rotate((rotation * Math.PI) / 180)
    ctx.translate(-pixelCrop.width / 2, -pixelCrop.height / 2)

    // Draw the image on the canvas
    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      pixelCrop.width,
      pixelCrop.height,
    )

    // Return the canvas as a data URL
    return canvas.toDataURL("image/jpeg", 0.9)
  }

  const handleCropImage = async () => {
    if (!croppedAreaPixels) return

    try {
      const croppedImage = await getCroppedImg(image, croppedAreaPixels, rotation)
      onCropComplete(croppedImage)
    } catch (e) {
      console.error("Error cropping image:", e)
    }
  }

  return (
    <Dialog open={true} onOpenChange={() => onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Crop Image</DialogTitle>
        </DialogHeader>
        <div className="relative w-full h-80 mt-4">
          <Cropper
            image={image}
            crop={crop}
            zoom={zoom}
            aspect={aspectRatio}
            rotation={rotation}
            onCropChange={onCropChange}
            onCropComplete={onCropCompleteCallback}
            onZoomChange={onZoomChange}
          />
        </div>
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center space-x-2">
            <ZoomOut className="h-4 w-4" />
            <Slider
              value={[zoom]}
              min={1}
              max={3}
              step={0.1}
              className="w-24"
              onValueChange={(value) => setZoom(value[0])}
            />
            <ZoomIn className="h-4 w-4" />
          </div>
          <Button variant="outline" size="icon" onClick={onRotationChange}>
            <RotateCw className="h-4 w-4" />
          </Button>
        </div>
        <DialogFooter className="sm:justify-between">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handleCropImage}>Apply</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
