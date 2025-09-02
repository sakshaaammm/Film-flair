import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { MovieCard } from '@/components/movies/MovieCard';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Bookmark, Calendar, Star, Trash2, SortAsc } from 'lucide-react';
import { Link } from 'react-router-dom';

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

interface WatchlistItem {
  id: string;
  movie_id: string;
  added_at: string;
  movies: Movie;
}

export default function Watchlist() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [watchlistItems, setWatchlistItems] = useState<WatchlistItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGenre, setSelectedGenre] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('added_recent');
  
  const allGenres = ['Action', 'Adventure', 'Animation', 'Comedy', 'Crime', 'Drama', 'Family', 'Fantasy', 'Horror', 'Mystery', 'Romance', 'Sci-Fi', 'Thriller', 'War'];

  useEffect(() => {
    if (user) {
      fetchWatchlist();
    }
  }, [user]);

  useEffect(() => {
    filterAndSortItems();
  }, [watchlistItems, selectedGenre, sortBy]);

  const fetchWatchlist = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('watchlist')
        .select(`
          *,
          movies (*)
        `)
        .eq('user_id', user.id)
        .order('added_at', { ascending: false });

      if (error) throw error;
      setWatchlistItems(data || []);
    } catch (error) {
      console.error('Error fetching watchlist:', error);
      toast({
        title: "Error",
        description: "Failed to load watchlist. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortItems = () => {
    let filtered = [...watchlistItems];

    if (selectedGenre) {
      filtered = filtered.filter(item => 
        item.movies.genre.includes(selectedGenre)
      );
    }

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'added_recent':
          return new Date(b.added_at).getTime() - new Date(a.added_at).getTime();
        case 'added_oldest':
          return new Date(a.added_at).getTime() - new Date(b.added_at).getTime();
        case 'title':
          return a.movies.title.localeCompare(b.movies.title);
        case 'year':
          return b.movies.release_year - a.movies.release_year;
        case 'rating':
          return b.movies.average_rating - a.movies.average_rating;
        default:
          return 0;
      }
    });

    setFilteredItems(filtered);
  };

  const handleRemoveFromWatchlist = async (movieId: string) => {
    if (!user) return;

    try {
      await supabase
        .from('watchlist')
        .delete()
        .eq('user_id', user.id)
        .eq('movie_id', movieId);
      
      setWatchlistItems(prev => prev.filter(item => item.movie_id !== movieId));
      toast({
        title: "Removed from watchlist",
        description: "Movie removed from your watchlist.",
      });
    } catch (error) {
      console.error('Error removing from watchlist:', error);
      toast({
        title: "Error",
        description: "Failed to remove movie from watchlist.",
        variant: "destructive",
      });
    }
  };

  const clearAllWatchlist = async () => {
    if (!user || !watchlistItems.length) return;

    try {
      await supabase
        .from('watchlist')
        .delete()
        .eq('user_id', user.id);
      
      setWatchlistItems([]);
      toast({
        title: "Watchlist cleared",
        description: "All movies removed from your watchlist.",
      });
    } catch (error) {
      console.error('Error clearing watchlist:', error);
      toast({
        title: "Error",
        description: "Failed to clear watchlist.",
        variant: "destructive",
      });
    }
  };

  if (!user) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="text-center py-12">
          <Bookmark className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-2xl font-semibold mb-4">Sign in to view your watchlist</h2>
          <p className="text-muted-foreground mb-6">
            Keep track of movies you want to watch by signing in to your account.
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-96 bg-muted rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-4">
          My <span className="bg-gradient-gold bg-clip-text text-transparent">Watchlist</span>
        </h1>
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground">
            {watchlistItems.length} movie{watchlistItems.length !== 1 ? 's' : ''} saved to watch later
          </p>
          {watchlistItems.length > 0 && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={clearAllWatchlist}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear All
            </Button>
          )}
        </div>
      </div>

      {watchlistItems.length > 0 ? (
        <>
          {/* Filters and Sort */}
          <div className="mb-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select value={selectedGenre} onValueChange={setSelectedGenre}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by Genre" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Genres</SelectItem>
                  {allGenres.map(genre => (
                    <SelectItem key={genre} value={genre}>{genre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger>
                  <SortAsc className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="added_recent">Recently Added</SelectItem>
                  <SelectItem value="added_oldest">Oldest First</SelectItem>
                  <SelectItem value="title">Title (A-Z)</SelectItem>
                  <SelectItem value="year">Release Year</SelectItem>
                  <SelectItem value="rating">Highest Rated</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {selectedGenre && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Filter:</span>
                <Badge variant="secondary" className="gap-1">
                  Genre: {selectedGenre}
                  <button onClick={() => setSelectedGenre('')}>
                    ×
                  </button>
                </Badge>
              </div>
            )}

            <div className="text-sm text-muted-foreground">
              Showing {filteredItems.length} of {watchlistItems.length} movies
            </div>
          </div>

          {/* Movies Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredItems.map((item) => (
              <div key={item.id} className="relative">
                <MovieCard
                  movie={item.movies}
                  isInWatchlist={true}
                  onWatchlistToggle={handleRemoveFromWatchlist}
                />
                <div className="absolute top-2 left-2 bg-background/80 backdrop-blur-sm rounded-full px-2 py-1">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>{new Date(item.added_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="text-center py-12">
          <div className="max-w-md mx-auto">
            <Bookmark className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Your watchlist is empty</h3>
            <p className="text-muted-foreground mb-6">
              Browse movies and add them to your watchlist to keep track of what you want to watch.
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