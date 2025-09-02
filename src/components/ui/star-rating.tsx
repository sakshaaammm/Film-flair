import React from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StarRatingProps {
  rating: number;
  maxRating?: number;
  size?: number;
  interactive?: boolean;
  onRatingChange?: (rating: number) => void;
  className?: string;
}

export function StarRating({
  rating,
  maxRating = 5,
  size = 20,
  interactive = false,
  onRatingChange,
  className
}: StarRatingProps) {
  const [hoveredRating, setHoveredRating] = React.useState(0);

  const handleStarClick = (starRating: number) => {
    if (interactive && onRatingChange) {
      onRatingChange(starRating);
    }
  };

  const handleStarHover = (starRating: number) => {
    if (interactive) {
      setHoveredRating(starRating);
    }
  };

  const handleMouseLeave = () => {
    if (interactive) {
      setHoveredRating(0);
    }
  };

  return (
    <div 
      className={cn("flex items-center gap-1", className)}
      onMouseLeave={handleMouseLeave}
    >
      {Array.from({ length: maxRating }, (_, index) => {
        const starRating = index + 1;
        const displayRating = interactive ? hoveredRating || rating : rating;
        const isFilled = starRating <= displayRating;
        const isPartial = !interactive && starRating - 0.5 <= rating && starRating > rating;

        return (
          <Star
            key={index}
            size={size}
            className={cn(
              "transition-all duration-200",
              interactive && "cursor-pointer hover:scale-110",
              isFilled
                ? "fill-primary text-primary"
                : isPartial
                ? "fill-primary/50 text-primary"
                : "fill-none text-muted-foreground hover:text-primary"
            )}
            onClick={() => handleStarClick(starRating)}
            onMouseEnter={() => handleStarHover(starRating)}
          />
        );
      })}
      {!interactive && (
        <span className="ml-2 text-sm text-muted-foreground">
          {rating.toFixed(1)}/5
        </span>
      )}
    </div>
  );
}