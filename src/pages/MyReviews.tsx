import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StarRating } from '@/components/ui/star-rating';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Star, Film, Calendar, Edit3, Trash2, SortAsc } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Review {
  id: string;
  rating: number;
  review_text?: string;
  created_at: string;
  updated_at: string;
  movie_id: string;
  movies: {
    id: string;
    title: string;
    poster_url?: string;
    genre: string[];
    release_year: number;
  };
}

export default function MyReviews() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [filteredReviews, setFilteredReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<string>('recent');
  const [filterRating, setFilterRating] = useState<string>('');

  useEffect(() => {
    if (user) {
      fetchReviews();
    }
  }, [user]);

  useEffect(() => {
    filterAndSortReviews();
  }, [reviews, sortBy, filterRating]);

  const fetchReviews = async () => {
    if (!user) return;

    try {
      // First fetch user's reviews
      const { data: reviewsData, error: reviewsError } = await supabase
        .from('reviews')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (reviewsError) throw reviewsError;

      if (reviewsData && reviewsData.length > 0) {
        // Get movie IDs
        const movieIds = [...new Set(reviewsData.map(review => review.movie_id))];
        
        // Fetch movies for these reviews
        const { data: moviesData, error: moviesError } = await supabase
          .from('movies')
          .select('id, title, poster_url, genre, release_year')
          .in('id', movieIds);

        if (moviesError) throw moviesError;

        // Combine the data
        const reviewsWithMovies = reviewsData.map(review => ({
          ...review,
          movies: moviesData?.find(movie => movie.id === review.movie_id) || {
            id: review.movie_id,
            title: 'Unknown Movie',
            poster_url: null,
            genre: [],
            release_year: 0
          }
        }));

        setReviews(reviewsWithMovies);
      } else {
        setReviews([]);
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
      toast({
        title: "Error",
        description: "Failed to load your reviews. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortReviews = () => {
    let filtered = [...reviews];

    if (filterRating && filterRating !== 'all') {
      const rating = parseInt(filterRating);
      filtered = filtered.filter(review => review.rating === rating);
    }

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'recent':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'rating_high':
          return b.rating - a.rating;
        case 'rating_low':
          return a.rating - b.rating;
        case 'movie_title':
          return a.movies.title.localeCompare(b.movies.title);
        case 'movie_year':
          return b.movies.release_year - a.movies.release_year;
        default:
          return 0;
      }
    });

    setFilteredReviews(filtered);
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (!user) return;

    if (!confirm('Are you sure you want to delete this review?')) return;

    try {
      await supabase
        .from('reviews')
        .delete()
        .eq('id', reviewId)
        .eq('user_id', user.id);

      setReviews(prev => prev.filter(review => review.id !== reviewId));
      toast({
        title: "Review deleted",
        description: "Your review has been deleted successfully.",
      });
    } catch (error) {
      console.error('Error deleting review:', error);
      toast({
        title: "Error",
        description: "Failed to delete review. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getReviewStats = () => {
    const totalReviews = reviews.length;
    const averageRating = totalReviews > 0 
      ? reviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews 
      : 0;
    
    const ratingDistribution = [1, 2, 3, 4, 5].map(rating => ({
      rating,
      count: reviews.filter(review => review.rating === rating).length
    }));

    return { totalReviews, averageRating, ratingDistribution };
  };

  if (!user) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="text-center py-12">
          <Star className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-2xl font-semibold mb-4">Sign in to view your reviews</h2>
          <p className="text-muted-foreground mb-6">
            Create an account to start writing and managing movie reviews.
          </p>
          <Link to="/auth">
            <Button>Sign In</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-20 bg-muted rounded-lg"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-48 bg-muted rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const stats = getReviewStats();

  return (
    <div className="container mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-4">
          My <span className="bg-gradient-gold bg-clip-text text-transparent">Reviews</span>
        </h1>
        <p className="text-muted-foreground">
          Manage and track all your movie reviews in one place
        </p>
      </div>

      {reviews.length > 0 ? (
        <>
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <Card>
              <CardContent className="p-6 text-center">
                <Film className="h-8 w-8 text-primary mx-auto mb-2" />
                <div className="text-2xl font-bold">{stats.totalReviews}</div>
                <div className="text-muted-foreground">Movies Reviewed</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 text-center">
                <div className="mx-auto mb-2">
                  <StarRating rating={stats.averageRating} size={20} />
                </div>
                <div className="text-2xl font-bold">{stats.averageRating.toFixed(1)}</div>
                <div className="text-muted-foreground">Average Rating</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold mb-3 text-center">Rating Distribution</h3>
                <div className="space-y-1">
                  {stats.ratingDistribution.reverse().map(({ rating, count }) => (
                    <div key={rating} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-1">
                        <span>{rating}</span>
                        <Star className="h-3 w-3 fill-current text-primary" />
                      </div>
                      <span className="text-muted-foreground">{count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters and Sort */}
          <div className="mb-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select value={filterRating} onValueChange={setFilterRating}>
                <SelectTrigger>
                  <Star className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by Rating" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Ratings</SelectItem>
                  <SelectItem value="5">5 Stars</SelectItem>
                  <SelectItem value="4">4 Stars</SelectItem>
                  <SelectItem value="3">3 Stars</SelectItem>
                  <SelectItem value="2">2 Stars</SelectItem>
                  <SelectItem value="1">1 Star</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger>
                  <SortAsc className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recent">Most Recent</SelectItem>
                  <SelectItem value="oldest">Oldest First</SelectItem>
                  <SelectItem value="rating_high">Highest Rated</SelectItem>
                  <SelectItem value="rating_low">Lowest Rated</SelectItem>
                  <SelectItem value="movie_title">Movie Title (A-Z)</SelectItem>
                  <SelectItem value="movie_year">Movie Year</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="text-sm text-muted-foreground">
              Showing {filteredReviews.length} of {reviews.length} reviews
            </div>
          </div>

          {/* Reviews Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredReviews.map((review) => (
              <Card key={review.id} className="hover:shadow-elevated transition-shadow">
                <CardContent className="p-6">
                  <div className="flex gap-4">
                    {/* Movie Poster */}
                    <div className="w-16 h-24 bg-muted rounded overflow-hidden flex-shrink-0">
                      {review.movies.poster_url ? (
                        <img
                          src={review.movies.poster_url}
                          alt={review.movies.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-dark">
                          <Film className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                    </div>

                    {/* Review Content */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <Link 
                          to={`/movies/${review.movies.id}`}
                          className="font-semibold hover:text-primary transition-colors line-clamp-1"
                        >
                          {review.movies.title}
                        </Link>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            asChild
                          >
                            <Link to={`/movies/${review.movies.id}`}>
                              <Edit3 className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            onClick={() => handleDeleteReview(review.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between mb-2">
                        <StarRating rating={review.rating} size={14} />
                        <span className="text-xs text-muted-foreground">
                          {review.movies.release_year}
                        </span>
                      </div>

                      {review.review_text && (
                        <p className="text-sm text-muted-foreground line-clamp-3 mb-2">
                          {review.review_text}
                        </p>
                      )}

                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>{new Date(review.created_at).toLocaleDateString()}</span>
                        </div>
                        {review.updated_at !== review.created_at && (
                          <span>Edited {new Date(review.updated_at).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      ) : (
        <div className="text-center py-12">
          <div className="max-w-md mx-auto">
            <Star className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No reviews yet</h3>
            <p className="text-muted-foreground mb-6">
              Start reviewing movies to track your thoughts and help others discover great films.
            </p>
            <div className="space-y-2">
              <Link to="/movies">
                <Button className="w-full">Browse Movies</Button>
              </Link>
              <Link to="/search">
                <Button variant="outline" className="w-full">Search Movies</Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}