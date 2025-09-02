import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { MovieCard } from '@/components/movies/MovieCard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Search, Filter, X } from 'lucide-react';

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

export default function Movies() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [movies, setMovies] = useState<Movie[]>([]);
  const [filteredMovies, setFilteredMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGenre, setSelectedGenre] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('title');
  const [yearFilter, setYearFilter] = useState<string>('');
  const [watchlist, setWatchlist] = useState<string[]>([]);
  
  const allGenres = ['Action', 'Adventure', 'Animation', 'Comedy', 'Crime', 'Drama', 'Family', 'Fantasy', 'Horror', 'Mystery', 'Romance', 'Sci-Fi', 'Thriller', 'War'];

  useEffect(() => {
    fetchMovies();
    if (user) {
      fetchWatchlist();
    }
  }, [user]);

  useEffect(() => {
    filterAndSortMovies();
  }, [movies, searchTerm, selectedGenre, sortBy, yearFilter]);

  const fetchMovies = async () => {
    try {
      const { data, error } = await supabase
        .from('movies')
        .select('*')
        .order('title');

      if (error) throw error;
      setMovies(data || []);
    } catch (error) {
      console.error('Error fetching movies:', error);
      toast({
        title: "Error",
        description: "Failed to load movies. Please try again.",
        variant: "destructive",
      });
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

  const filterAndSortMovies = () => {
    let filtered = [...movies];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(movie =>
        movie.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        movie.director.toLowerCase().includes(searchTerm.toLowerCase()) ||
        movie.actors.some(actor => actor.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Genre filter
    if (selectedGenre) {
      filtered = filtered.filter(movie =>
        movie.genre.includes(selectedGenre)
      );
    }

    // Year filter
    if (yearFilter) {
      const year = parseInt(yearFilter);
      filtered = filtered.filter(movie => movie.release_year === year);
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'title':
          return a.title.localeCompare(b.title);
        case 'year':
          return b.release_year - a.release_year;
        case 'rating':
          return b.average_rating - a.average_rating;
        case 'reviews':
          return b.total_reviews - a.total_reviews;
        default:
          return 0;
      }
    });

    setFilteredMovies(filtered);
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

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedGenre('');
    setYearFilter('');
    setSortBy('title');
  };

  const hasActiveFilters = searchTerm || selectedGenre || yearFilter || sortBy !== 'title';

  if (loading) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="animate-pulse space-y-8">
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
          Discover <span className="bg-gradient-gold bg-clip-text text-transparent">Movies</span>
        </h1>
        <p className="text-muted-foreground">
          Explore our collection of {movies.length} movies and find your next favorite film.
        </p>
      </div>

      {/* Filters */}
      <div className="mb-8 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search movies, directors, actors..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Genre Filter */}
          <Select value={selectedGenre} onValueChange={setSelectedGenre}>
            <SelectTrigger>
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="All Genres" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Genres</SelectItem>
              {allGenres.map(genre => (
                <SelectItem key={genre} value={genre}>{genre}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Year Filter */}
          <Input
            type="number"
            placeholder="Release Year"
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
            min="1900"
            max={new Date().getFullYear()}
          />

          {/* Sort */}
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="title">Title (A-Z)</SelectItem>
              <SelectItem value="year">Release Year</SelectItem>
              <SelectItem value="rating">Highest Rated</SelectItem>
              <SelectItem value="reviews">Most Reviewed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Active Filters & Clear */}
        {hasActiveFilters && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-muted-foreground">Active filters:</span>
            {searchTerm && (
              <Badge variant="secondary" className="gap-1">
                Search: {searchTerm}
                <X className="h-3 w-3 cursor-pointer" onClick={() => setSearchTerm('')} />
              </Badge>
            )}
            {selectedGenre && (
              <Badge variant="secondary" className="gap-1">
                Genre: {selectedGenre}
                <X className="h-3 w-3 cursor-pointer" onClick={() => setSelectedGenre('')} />
              </Badge>
            )}
            {yearFilter && (
              <Badge variant="secondary" className="gap-1">
                Year: {yearFilter}
                <X className="h-3 w-3 cursor-pointer" onClick={() => setYearFilter('')} />
              </Badge>
            )}
            <Button variant="outline" size="sm" onClick={clearFilters}>
              Clear All
            </Button>
          </div>
        )}
      </div>

      {/* Results */}
      <div className="mb-4">
        <p className="text-muted-foreground">
          Showing {filteredMovies.length} of {movies.length} movies
        </p>
      </div>

      {/* Movies Grid */}
      {filteredMovies.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredMovies.map((movie) => (
            <MovieCard
              key={movie.id}
              movie={movie}
              isInWatchlist={watchlist.includes(movie.id)}
              onWatchlistToggle={handleWatchlistToggle}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="max-w-md mx-auto">
            <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No movies found</h3>
            <p className="text-muted-foreground mb-4">
              Try adjusting your search criteria or clear the filters to see all movies.
            </p>
            <Button onClick={clearFilters} variant="outline">
              Clear Filters
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}