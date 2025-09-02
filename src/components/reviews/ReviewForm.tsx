import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { StarRating } from '@/components/ui/star-rating';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Star } from 'lucide-react';

interface ReviewFormProps {
  movieId: string;
  onReviewSubmitted: () => void;
  onCancel: () => void;
}

export function ReviewForm({ movieId, onReviewSubmitted, onCancel }: ReviewFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || rating === 0) return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('reviews')
        .insert({
          user_id: user.id,
          movie_id: movieId,
          rating,
          review_text: reviewText.trim() || null
        });

      if (error) throw error;

      toast({
        title: "Review submitted",
        description: "Your review has been posted successfully.",
      });
      
      onReviewSubmitted();
    } catch (error) {
      console.error('Error submitting review:', error);
      toast({
        title: "Error",
        description: "Failed to submit review. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium mb-2">Your Rating *</label>
        <div className="flex items-center gap-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              className="p-1 hover:scale-110 transition-transform"
            >
              <Star
                className={`h-6 w-6 ${
                  star <= rating
                    ? 'fill-primary text-primary'
                    : 'text-muted-foreground hover:text-primary'
                }`}
              />
            </button>
          ))}
          <span className="ml-2 text-sm text-muted-foreground">
            {rating > 0 ? `${rating} star${rating !== 1 ? 's' : ''}` : 'Select a rating'}
          </span>
        </div>
      </div>

      <div>
        <label htmlFor="review-text" className="block text-sm font-medium mb-2">
          Your Review (Optional)
        </label>
        <Textarea
          id="review-text"
          placeholder="Share your thoughts about this movie..."
          value={reviewText}
          onChange={(e) => setReviewText(e.target.value)}
          rows={4}
        />
      </div>

      <div className="flex gap-3">
        <Button
          type="submit"
          disabled={rating === 0 || submitting}
          className="flex-1"
        >
          {submitting ? 'Submitting...' : 'Submit Review'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={submitting}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}