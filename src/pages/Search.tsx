import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Search as SearchIcon, Film, TrendingUp, Loader2, Calendar, Star, Bookmark, BookmarkCheck } from 'lucide-react';

interface Movie {
  id: string;
  title: string;
  synopsis: string;
  poster_url?: string;
  backdrop_url?: string;
  release_year?: number;
  average_rating: number;
  total_reviews: number;
  genre_ids?: number[];
  external_id?: number;
}

interface SearchResponse {
  movies: Movie[];
  total_pages: number;
  total_results: number;
  current_page: number;
}

const genreMap: { [key: number]: string } = {
  28: "Action", 12: "Adventure", 16: "Animation", 35: "Comedy", 80: "Crime",
  99: "Documentary", 18: "Drama", 10751: "Family", 14: "Fantasy", 36: "History",
  27: "Horror", 10402: "Music", 9648: "Mystery", 10749: "Romance", 878: "Science Fiction",
  10770: "TV Movie", 53: "Thriller", 10752: "War", 37: "Western"
};

export default function Search() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Movie[]>([]);
  const [trendingMovies, setTrendingMovies] = useState<Movie[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalResults, setTotalResults] = useState(0);
  const [loading, setLoading] = useState(false);
  const [trendingLoading, setTrendingLoading] = useState(true);
  const [sortBy, setSortBy] = useState<string>('relevance');
  const [watchlistMovies, setWatchlistMovies] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchTrendingMovies();
    if (user) {
      fetchWatchlistMovies();
    }
  }, [user]);

  const fetchTrendingMovies = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('trending-movies');
      
      if (error) throw error;
      
      setTrendingMovies(data.movies || []);
    } catch (error) {
      console.error('Error fetching trending movies:', error);
      toast({
        title: "Error",
        description: "Failed to load trending movies.",
        variant: "destructive",
      });
    } finally {
      setTrendingLoading(false);
    }
  };

  const fetchWatchlistMovies = async () => {
    if (!user) return;

    try {
      const { data } = await supabase
        .from('watchlist')
        .select('movie_id')
        .eq('user_id', user.id);

      if (data) {
        setWatchlistMovies(new Set(data.map(item => item.movie_id)));
      }
    } catch (error) {
      console.error('Error fetching watchlist:', error);
    }
  };

  const handleSearch = async (page: number = 1) => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('search-movies', {
        body: { query: searchQuery, page }
      });
      
      if (error) throw error;
      
      setSearchResults(data.movies || []);
      setTotalPages(data.total_pages || 0);
      setTotalResults(data.total_results || 0);
      setCurrentPage(page);
    } catch (error) {
      console.error('Error searching movies:', error);
      toast({
        title: "Error",
        description: "Failed to search movies. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
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
      const isInWatchlist = watchlistMovies.has(movieId);
      
      if (isInWatchlist) {
        await supabase
          .from('watchlist')
          .delete()
          .eq('user_id', user.id)
          .eq('movie_id', movieId);
        
        setWatchlistMovies(prev => {
          const newSet = new Set(prev);
          newSet.delete(movieId);
          return newSet;
        });
        
        toast({
          title: "Removed from watchlist",
          description: "Movie removed from your watchlist.",
        });
      } else {
        await supabase
          .from('watchlist')
          .insert({ user_id: user.id, movie_id: movieId });
        
        setWatchlistMovies(prev => new Set([...prev, movieId]));
        
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

  const sortMovies = (movies: Movie[]) => {
    const sortedMovies = [...movies];
    switch (sortBy) {
      case 'rating':
        return sortedMovies.sort((a, b) => b.average_rating - a.average_rating);
      case 'year':
        return sortedMovies.sort((a, b) => (b.release_year || 0) - (a.release_year || 0));
      case 'title':
        return sortedMovies.sort((a, b) => a.title.localeCompare(b.title));
      default:
        return sortedMovies;
    }
  };

  const MovieCard = ({ movie }: { movie: Movie }) => {
    const isInWatchlist = watchlistMovies.has(movie.id);
    const genres = movie.genre_ids?.slice(0, 3).map(id => genreMap[id]).filter(Boolean) || [];

    return (
      <Card className="group hover:shadow-elevated transition-all duration-300 bg-card/50 backdrop-blur-sm border-border/50">
        <div className="relative aspect-[2/3] overflow-hidden rounded-t-lg">
          {movie.poster_url ? (
            <img
              src={movie.poster_url}
              alt={`${movie.title} poster`}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/50">
              <Film className="h-16 w-16 text-muted-foreground" />
            </div>
          )}
          
          {user && (
            <Button
              size="sm"
              variant={isInWatchlist ? "secondary" : "outline"}
              className="absolute top-2 right-2 h-8 w-8 p-0 bg-background/80 backdrop-blur-sm"
              onClick={() => handleWatchlistToggle(movie.id)}
            >
              {isInWatchlist ? (
                <BookmarkCheck className="h-4 w-4" />
              ) : (
                <Bookmark className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>
        
        <CardContent className="p-4">
          <div className="space-y-2">
            <h3 className="font-semibold text-foreground line-clamp-2 text-sm">
              {movie.title}
            </h3>
            
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              {movie.release_year && (
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  <span>{movie.release_year}</span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <Star className="h-3 w-3 fill-current text-primary" />
                <span>{movie.average_rating.toFixed(1)}</span>
              </div>
            </div>
            
            {genres.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {genres.map((genre) => (
                  <Badge key={genre} variant="secondary" className="text-xs px-2 py-0">
                    {genre}
                  </Badge>
                ))}
              </div>
            )}
            
            <p className="text-xs text-muted-foreground line-clamp-3">
              {movie.synopsis}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="container mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-4">
          <span className="bg-gradient-gold bg-clip-text text-transparent">Discover</span> Movies
        </h1>
        <p className="text-muted-foreground">
          Search millions of movies from around the world
        </p>
      </div>

      {/* Search Bar */}
      <Card className="mb-8">
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Search for movies..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch(1)}
                  className="text-base"
                />
              </div>
              <Button onClick={() => handleSearch(1)} disabled={loading || !searchQuery.trim()}>
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <SearchIcon className="h-4 w-4 mr-2" />
                )}
                Search
              </Button>
            </div>
            
            {searchResults.length > 0 && (
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Found {totalResults.toLocaleString()} results
                </p>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="relevance">Most Relevant</SelectItem>
                    <SelectItem value="rating">Highest Rated</SelectItem>
                    <SelectItem value="year">Newest First</SelectItem>
                    <SelectItem value="title">Title (A-Z)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Search Results */}
      {searchResults.length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Search Results</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {sortMovies(searchResults).map((movie) => (
              <MovieCard key={movie.id} movie={movie} />
            ))}
          </div>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center mt-8 gap-2">
              <Button
                variant="outline"
                onClick={() => handleSearch(currentPage - 1)}
                disabled={currentPage <= 1 || loading}
              >
                Previous
              </Button>
              <span className="flex items-center px-4 text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                onClick={() => handleSearch(currentPage + 1)}
                disabled={currentPage >= totalPages || loading}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Trending Movies */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-semibold">Trending This Week</h2>
        </div>
        
        {trendingLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="aspect-[2/3] bg-muted rounded-lg animate-pulse"></div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {trendingMovies.slice(0, 12).map((movie) => (
              <MovieCard key={movie.id} movie={movie} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}