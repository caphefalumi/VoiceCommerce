import { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';

const PLACEHOLDER_IMAGE = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600"><rect fill="%23f3f4f6" width="600" height="600"/><text fill="%239ca3af" font-family="system-ui" font-size="24" x="50%" y="50%" text-anchor="middle" dy=".3em">No Image</text></svg>');

interface ImageGalleryProps {
  images: string[];
  productName: string;
}

export function ImageGallery({ images, productName }: ImageGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Fallback if no images
  const safeImages = images?.length ? images : [PLACEHOLDER_IMAGE];

  return (
    <div className="flex flex-col gap-4">
      {/* Main Image */}
      <div className="relative aspect-square w-full overflow-hidden rounded-xl border bg-white p-4 shadow-sm">
        <img
          src={safeImages[selectedIndex]}
          alt={`${productName} - View ${selectedIndex + 1}`}
          className="h-full w-full object-contain transition-all duration-300 hover:scale-105"
        />
      </div>

      {/* Thumbnails Carousel */}
      {safeImages.length > 1 && (
        <Carousel
          opts={{
            align: 'start',
            loop: true,
          }}
          className="w-full"
        >
          <CarouselContent className="-ml-2 p-1">
            {safeImages.map((img, index) => (
              <CarouselItem key={index} className="basis-1/4 pl-2 sm:basis-1/5 md:basis-1/4">
                <button
                  onClick={() => setSelectedIndex(index)}
                  className={cn(
                    'relative aspect-square w-full overflow-hidden rounded-lg border bg-white p-1 transition-all',
                    selectedIndex === index
                      ? 'ring-2 ring-primary ring-offset-1'
                      : 'opacity-70 hover:opacity-100',
                  )}
                >
                  <img
                    src={img}
                    alt={`Thumbnail ${index + 1}`}
                    className="h-full w-full object-contain"
                  />
                </button>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="-left-3 h-8 w-8" />
          <CarouselNext className="-right-3 h-8 w-8" />
        </Carousel>
      )}
    </div>
  );
}
