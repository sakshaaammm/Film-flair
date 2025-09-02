import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StarRating } from '@/components/ui/star-rating';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Clock, Calendar, Bookmark, BookmarkCheck, Star, User, ArrowLeft, Play } from 'lucide-react';
import { ReviewForm } from '@/components/reviews/ReviewForm';
import { ReviewList } from '@/components/reviews/ReviewList';

interface Movie {
  id: string;
  title: string;
  genre: string[];
  release_year: number;
  director: string;
  actors: string[];
  synopsis: string;
  poster_url?: string;
  trailer_url?: string;
  runtime: number;
  average_rating: number;
  total_reviews: number;
  created_at: string;
}

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

export default function MovieDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const [movie, setMovie] = useState<Movie | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [userReview, setUserReview] = useState<Review | null>(null);
  const [isInWatchlist, setIsInWatchlist] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showReviewForm, setShowReviewForm] = useState(false);

  useEffect(() => {
    if (id) {
      fetchMovie();
      fetchReviews();
      if (user) {
        checkWatchlistStatus();
        checkUserReview();
      }
    }
  }, [id, user]);

  const fetchMovie = async () => {
    if (!id) return;

    try {
      const { data, error } = await supabase
        .from('movies')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setMovie(data);
    } catch (error) {
      console.error('Error fetching movie:', error);
      toast({
        title: "Error",
        description: "Failed to load movie details.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchReviews = async () => {
    if (!id) return;

    try {
      // First fetch reviews
      const { data: reviewsData, error: reviewsError } = await supabase
        .from('reviews')
        .select('*')
        .eq('movie_id', id)
        .order('created_at', { ascending: false });

      if (reviewsError) throw reviewsError;

      if (reviewsData && reviewsData.length > 0) {
        // Get unique user IDs
        const userIds = [...new Set(reviewsData.map(review => review.user_id))];
        
        // Fetch profiles for these users
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('user_id, display_name, username')
          .in('user_id', userIds);

        if (profilesError) throw profilesError;

        // Combine the data
        const reviewsWithProfiles = reviewsData.map(review => ({
          ...review,
          profiles: profilesData?.find(profile => profile.user_id === review.user_id) || {
            display_name: 'Unknown User',
            username: 'unknown'
          }
        }));

        setReviews(reviewsWithProfiles);
      } else {
        setReviews([]);
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
      setReviews([]);
    }
  };

  const checkWatchlistStatus = async () => {
    if (!user || !id) return;

    try {
      const { data } = await supabase
        .from('watchlist')
        .select('id')
        .eq('user_id', user.id)
        .eq('movie_id', id)
        .single();

      setIsInWatchlist(!!data);
    } catch (error) {
      // No watchlist entry found
      setIsInWatchlist(false);
    }
  };

  const checkUserReview = async () => {
    if (!user || !id) return;

    try {
      // First fetch user's review
      const { data: reviewData, error: reviewError } = await supabase
        .from('reviews')
        .select('*')
        .eq('user_id', user.id)
        .eq('movie_id', id)
        .maybeSingle();

      if (reviewError) throw reviewError;

      if (reviewData) {
        // Fetch user's profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('display_name, username')
          .eq('user_id', user.id)
          .single();

        if (profileError) throw profileError;

        setUserReview({
          ...reviewData,
          profiles: profileData || {
            display_name: 'Unknown User',
            username: 'unknown'
          }
        });
      } else {
        setUserReview(null);
      }
    } catch (error) {
      console.error('Error fetching user review:', error);
      setUserReview(null);
    }
  };

  const handleWatchlistToggle = async () => {
    if (!user || !id) {
      toast({
        title: "Sign in required",
        description: "Please sign in to manage your watchlist.",
        variant: "destructive",
      });
      return;
    }

    try {
      if (isInWatchlist) {
        await supabase
          .from('watchlist')
          .delete()
          .eq('user_id', user.id)
          .eq('movie_id', id);
        
        setIsInWatchlist(false);
        toast({
          title: "Removed from watchlist",
          description: "Movie removed from your watchlist.",
        });
      } else {
        await supabase
          .from('watchlist')
          .insert({ user_id: user.id, movie_id: id });
        
        setIsInWatchlist(true);
        toast({
          title: "Added to watchlist",
          description: "Movie added to your watchlist.",
        });
      }
    } catch (error) {
      console.error('Error updating watchlist:', error);
      toast({
        title: "Error",
        description: "Failed to update watchlist. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleReviewSubmitted = () => {
    setShowReviewForm(false);
    fetchReviews();
    fetchMovie(); // Refresh to get updated ratings
    checkUserReview();
  };

  if (loading) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-32 bg-muted rounded"></div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="h-96 bg-muted rounded-lg"></div>
            <div className="lg:col-span-2 space-y-4">
              <div className="h-12 bg-muted rounded"></div>
              <div className="h-4 bg-muted rounded w-2/3"></div>
              <div className="h-20 bg-muted rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!movie) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="text-center py-12">
          <h2 className="text-2xl font-semibold mb-4">Movie not found</h2>
          <Link to="/movies">
            <Button>Back to Movies</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8">
      {/* Back Button */}
      <div className="mb-6">
        <Link to="/movies">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Movies
          </Button>
        </Link>
      </div>

      {/* Movie Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {/* Poster */}
        <div className="lg:col-span-1">
          <div className="sticky top-8">
            <div className="aspect-[2/3] relative overflow-hidden rounded-lg bg-muted">
              {movie.poster_url ? (
                <img
                  src={movie.poster_url}
                  alt={`${movie.title} poster`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-dark">
                  <span className="text-muted-foreground text-center p-4">
                    No poster available
                  </span>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="mt-6 space-y-3">
              {movie.trailer_url && (
                <Button className="w-full" asChild>
                  <a href={movie.trailer_url} target="_blank" rel="noopener noreferrer">
                    <Play className="h-4 w-4 mr-2" />
                    Watch Trailer
                  </a>
                </Button>
              )}
              
              <Button
                variant={isInWatchlist ? "secondary" : "outline"}
                className="w-full"
                onClick={handleWatchlistToggle}
              >
                {isInWatchlist ? (
                  <>
                    <BookmarkCheck className="h-4 w-4 mr-2" />
                    In Watchlist
                  </>
                ) : (
                  <>
                    <Bookmark className="h-4 w-4 mr-2" />
                    Add to Watchlist
                  </>
                )}
              </Button>

              {user && !userReview && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setShowReviewForm(!showReviewForm)}
                >
                  <Star className="h-4 w-4 mr-2" />
                  Write Review
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Movie Info */}
        <div className="lg:col-span-2 space-y-6">
          <div>
            <h1 className="text-4xl font-bold mb-4">{movie.title}</h1>
            
            <div className="flex flex-wrap items-center gap-4 text-muted-foreground mb-4">
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>{movie.release_year}</span>
              </div>
              {movie.runtime && (
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span>{movie.runtime}m</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <StarRating rating={movie.average_rating} size={16} />
                <span>{movie.average_rating.toFixed(1)} ({movie.total_reviews} review{movie.total_reviews !== 1 ? 's' : ''})</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-6">
              {movie.genre.map((g) => (
                <Badge key={g} variant="secondary">
                  {g}
                </Badge>
              ))}
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Synopsis</h3>
                <p className="text-muted-foreground leading-relaxed">{movie.synopsis}</p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Director</h3>
                <p className="text-foreground">{movie.director}</p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Cast</h3>
                <p className="text-foreground">{movie.actors.join(', ')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Review Form */}
      {showReviewForm && user && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Write Your Review</CardTitle>
          </CardHeader>
          <CardContent>
            <ReviewForm 
              movieId={movie.id}
              onReviewSubmitted={handleReviewSubmitted}
              onCancel={() => setShowReviewForm(false)}
            />
          </CardContent>
        </Card>
      )}

      {/* User's Review */}
      {userReview && (
        <Card className="mb-8 border-primary/20">
          <CardHeader>
            <CardTitle className="text-primary">Your Review</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <StarRating rating={userReview.rating} size={16} />
                <span className="text-sm text-muted-foreground">
                  {new Date(userReview.created_at).toLocaleDateString()}
                </span>
              </div>
              {userReview.review_text && (
                <p className="text-foreground">{userReview.review_text}</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reviews */}
      <Card>
        <CardHeader>
          <CardTitle>
            Reviews ({movie.total_reviews})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ReviewList reviews={reviews} />
        </CardContent>
      </Card>
    </div>
  );
}