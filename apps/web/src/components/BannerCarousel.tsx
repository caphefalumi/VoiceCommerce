import { Card, CardContent } from '@/components/ui/card';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';

const BANNER_PLACEHOLDER = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="800" height="300" viewBox="0 0 800 300"><rect fill="%23dbeafe" width="800" height="300"/><text fill="%239ca3af" font-family="system-ui" font-size="24" x="50%" y="50%" text-anchor="middle" dy=".3em">Banner</text></svg>');

const images = [
  BANNER_PLACEHOLDER,
  BANNER_PLACEHOLDER,
  BANNER_PLACEHOLDER,
  BANNER_PLACEHOLDER,
];

export function BannerCarousel() {
  return (
    <Carousel className="w-full max-w-5xl mx-auto">
      <CarouselContent>
        {images.map((src, index) => (
          <CarouselItem key={index}>
            <div className="p-1">
              <Card className="border-0 shadow-none">
                <CardContent className="flex aspect-[8/3] items-center justify-center p-0">
                  <img
                    src={src}
                    alt={`Banner ${index + 1}`}
                    className="w-full h-full object-cover rounded-lg"
                  />
                </CardContent>
              </Card>
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious className="left-2" />
      <CarouselNext className="right-2" />
    </Carousel>
  );
}
