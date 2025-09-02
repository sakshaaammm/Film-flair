import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MovieCard } from '@/components/movies/MovieCard';
import { StarRating } from '@/components/ui/star-rating';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Film, TrendingUp, Star, Users, ArrowRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Movie {
  id: string;
  title: string;
  genre: string[];
  release_year: number;
  director: string;
  actors: string[];
  synopsis: string;
  poster_url?: string;
  runtime: number;
  average_rating: number;
  total_reviews: number;
}

export default function Home() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [featuredMovies, setFeaturedMovies] = useState<Movie[]>([]);
  const [topRatedMovies, setTopRatedMovies] = useState<Movie[]>([]);
  const [recentReviews, setRecentReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [watchlist, setWatchlist] = useState<string[]>([]);

  useEffect(() => {
    fetchHomeData();
    if (user) {
      fetchWatchlist();
    }
  }, [user]);

  const fetchHomeData = async () => {
    try {
      // Fetch featured movies (movies with most reviews)
      const { data: featured } = await supabase
        .from('movies')
        .select('*')
        .order('total_reviews', { ascending: false })
        .limit(6);

      // Fetch top rated movies
      const { data: topRated } = await supabase
        .from('movies')
        .select('*')
        .order('average_rating', { ascending: false })
        .limit(4);

      // Fetch recent reviews with movie and profile data
      const { data: reviews } = await supabase
        .from('reviews')
        .select(`
          *,
          movies (title),
          profiles (username, display_name)
        `)
        .order('created_at', { ascending: false })
        .limit(5);

      setFeaturedMovies(featured || []);
      setTopRatedMovies(topRated || []);
      setRecentReviews(reviews || []);
    } catch (error) {
      console.error('Error fetching home data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchWatchlist = async () => {
    if (!user) return;

    try {
      const { data } = await supabase
        .from('watchlist')
        .select('movie_id')
        .eq('user_id', user.id);

      setWatchlist(data?.map(item => item.movie_id) || []);
    } catch (error) {
      console.error('Error fetching watchlist:', error);
    }
  };

  const handleWatchlistToggle = async (movieId: string) => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to manage your watchlist.",
        variant: "destructive",
      });
      return;
    }

    try {
      if (watchlist.includes(movieId)) {
        await supabase
          .from('watchlist')
          .delete()
          .eq('user_id', user.id)
          .eq('movie_id', movieId);
        
        setWatchlist(prev => prev.filter(id => id !== movieId));
        toast({
          title: "Removed from watchlist",
          description: "Movie removed from your watchlist.",
        });
      } else {
        await supabase
          .from('watchlist')
          .insert({ user_id: user.id, movie_id: movieId });
        
        setWatchlist(prev => [...prev, movieId]);
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

  if (loading) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="animate-pulse space-y-8">
          <div className="h-64 bg-muted rounded-lg"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-96 bg-muted rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8 space-y-12">
      {/* Hero Section */}
      <section className="relative rounded-2xl bg-gradient-dark p-8 md:p-12 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-background/95 to-background/50"></div>
        <div className="relative z-10 max-w-2xl">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            Discover Amazing{' '}
            <span className="bg-gradient-gold bg-clip-text text-transparent">
              Movies
            </span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            Join thousands of movie enthusiasts sharing reviews and discovering new favorites.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            {user ? (
              <Link to="/movies">
                <Button size="lg" className="bg-gradient-gold hover:opacity-90">
                  <Film className="mr-2 h-5 w-5" />
                  Browse Movies
                </Button>
              </Link>
            ) : (
              <Link to="/auth">
                <Button size="lg" className="bg-gradient-gold hover:opacity-90">
                  <Users className="mr-2 h-5 w-5" />
                  Join Community
                </Button>
              </Link>
            )}
            <Link to="/movies">
              <Button size="lg" variant="outline">
                <TrendingUp className="mr-2 h-5 w-5" />
                Trending Now
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Featured Movies */}
      <section>
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-bold">Featured Movies</h2>
          <Link to="/movies">
            <Button variant="ghost" className="group">
              View All
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
          </Link>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {featuredMovies.slice(0, 4).map((movie) => (
            <MovieCard
              key={movie.id}
              movie={movie}
              isInWatchlist={watchlist.includes(movie.id)}
              onWatchlistToggle={handleWatchlistToggle}
            />
          ))}
        </div>
      </section>

      {/* Top Rated & Recent Reviews */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Top Rated Movies */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <Star className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-bold">Top Rated</h2>
          </div>
          
          <div className="space-y-4">
            {topRatedMovies.map((movie) => (
              <Card key={movie.id} className="bg-gradient-card border-border/50">
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    <div className="w-16 h-24 bg-muted rounded-md flex-shrink-0">
                      {movie.poster_url ? (
                        <img
                          src={movie.poster_url}
                          alt={movie.title}
                          className="w-full h-full object-cover rounded-md"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-dark rounded-md"></div>
                      )}
                    </div>
                    <div className="flex-1">
                      <Link 
                        to={`/movies/${movie.id}`}
                        className="font-semibold hover:text-primary transition-colors"
                      >
                        {movie.title}
                      </Link>
                      <p className="text-sm text-muted-foreground mb-2">
                        {movie.release_year} • {movie.director}
                      </p>
                      <div className="flex items-center gap-2 mb-2">
                        <StarRating rating={movie.average_rating} size={14} />
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {movie.genre.slice(0, 2).map((g) => (
                          <Badge key={g} variant="secondary" className="text-xs">
                            {g}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Recent Reviews */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <Star className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-bold">Recent Reviews</h2>
          </div>
          
          <div className="space-y-4">
            {recentReviews.map((review) => (
              <Card key={review.id} className="bg-gradient-card border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <Link 
                        to={`/movies/${review.movie_id}`}
                        className="font-semibold hover:text-primary transition-colors"
                      >
                        {review.movies?.title}
                      </Link>
                      <p className="text-sm text-muted-foreground">
                        by {review.profiles?.display_name || review.profiles?.username}
                      </p>
                    </div>
                    <StarRating rating={review.rating} size={14} />
                  </div>
                  {review.review_text && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {review.review_text}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </div>

      {/* Call to Action */}
      {!user && (
        <section className="text-center py-12">
          <Card className="bg-gradient-card border-border/50 max-w-md mx-auto">
            <CardHeader>
              <CardTitle className="text-2xl">Join the Community</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-6">
                Sign up to create reviews, build your watchlist, and connect with fellow movie lovers.
              </p>
              <Link to="/auth">
                <Button className="bg-gradient-gold hover:opacity-90 w-full">
                  Get Started
                </Button>
              </Link>
            </CardContent>
          </Card>
        </section>
      )}
    </div>
  );
}