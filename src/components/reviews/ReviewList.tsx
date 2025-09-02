import React from 'react';
import { StarRating } from '@/components/ui/star-rating';
import { Badge } from '@/components/ui/badge';
import { User } from 'lucide-react';

interface Review {
  id: string;
  rating: number;
  review_text?: string;
  created_at: string;
  user_id: string;
  profiles: {
    display_name: string;
    username: string;
  };
}

interface ReviewListProps {
  reviews: Review[];
}

export function ReviewList({ reviews }: ReviewListProps) {
  if (reviews.length === 0) {
    return (
      <div className="text-center py-8">
        <User className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground">No reviews yet</p>
        <p className="text-sm text-muted-foreground">Be the first to review this movie!</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {reviews.map((review) => (
        <div key={review.id} className="border-b border-border pb-6 last:border-b-0">
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium">{review.profiles.display_name}</span>
                <Badge variant="outline" className="text-xs">
                  @{review.profiles.username}
                </Badge>
              </div>
              <StarRating rating={review.rating} size={16} />
            </div>
            <span className="text-sm text-muted-foreground">
              {new Date(review.created_at).toLocaleDateString()}
            </span>
          </div>
          
          {review.review_text && (
            <p className="text-foreground leading-relaxed">{review.review_text}</p>
          )}
        </div>
      ))}
    </div>
  );
}