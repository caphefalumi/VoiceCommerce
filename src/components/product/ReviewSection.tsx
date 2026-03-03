import type { Review } from "@/types/product";
import { Star, User } from "lucide-react";

interface ReviewSectionProps {
  rating: number;
  reviewCount: number;
  reviews?: Review[];
}

export function ReviewSection({ rating, reviewCount, reviews }: ReviewSectionProps) {
  const displayReviews: Review[] = reviews && reviews.length > 0 ? reviews : [
    {
      id: "1",
      userName: "Nguyen Van A",
      rating: 5,
      comment: "Great product, fast delivery!",
      date: "2023-10-25",
    },
    {
      id: "2",
      userName: "Tran Thi B",
      rating: 4,
      comment: "Good quality but a bit expensive.",
      date: "2023-10-20",
    },
    {
      id: "3",
      userName: "Le Van C",
      rating: 5,
      comment: "Perfect for my needs.",
      date: "2023-10-15",
    }
  ];

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2 rounded-lg bg-muted/20 p-6 text-center sm:flex-row sm:items-center sm:text-left">
        <div className="flex flex-col items-center gap-1 sm:items-start">
          <div className="flex items-center gap-2">
            <span className="text-4xl font-bold text-foreground">{rating}</span>
            <span className="text-muted-foreground">/ 5</span>
          </div>
          <div className="flex text-yellow-500">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={`h-5 w-5 ${i < Math.floor(rating) ? "fill-current" : "opacity-30"}`}
              />
            ))}
          </div>
          <p className="text-sm text-muted-foreground">Based on {reviewCount} reviews</p>
        </div>
        
        <div className="hidden h-16 w-px bg-border sm:mx-8 sm:block"></div>
        
        <div className="flex flex-1 flex-col gap-1">
          {[5, 4, 3, 2, 1].map((star) => (
            <div key={star} className="flex items-center gap-2 text-sm">
              <div className="flex w-12 items-center gap-1">
                <span className="font-medium">{star}</span>
                <Star className="h-3 w-3 fill-current text-yellow-500" />
              </div>
              <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden">
                <div 
                  className="h-full bg-yellow-500" 
                  style={{ width: star === 5 ? "70%" : star === 4 ? "20%" : "5%" }}
                ></div>
              </div>
              <span className="w-8 text-right text-muted-foreground">
                {star === 5 ? "70%" : star === 4 ? "20%" : "5%"}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-6">
        <h3 className="text-xl font-semibold">User Reviews</h3>
        <div className="grid gap-6">
          {displayReviews.map((review) => (
            <div key={review.id} className="flex gap-4 border-b pb-6 last:border-0">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <User className="h-5 w-5" />
              </div>
              <div className="flex flex-1 flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{review.userName}</span>
                  <span className="text-xs text-muted-foreground">{review.date}</span>
                </div>
                <div className="flex text-yellow-500">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`h-3 w-3 ${i < review.rating ? "fill-current" : "opacity-30"}`}
                    />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground">{review.comment}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
