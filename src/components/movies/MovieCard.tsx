import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StarRating } from '@/components/ui/star-rating';
import { Badge } from '@/components/ui/badge';
import { Clock, Calendar, Bookmark, BookmarkCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

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

interface MovieCardProps {
  movie: Movie;
  isInWatchlist?: boolean;
  onWatchlistToggle?: (movieId: string) => void;
  className?: string;
}

export function MovieCard({ 
  movie, 
  isInWatchlist = false, 
  onWatchlistToggle,
  className 
}: MovieCardProps) {
  const handleWatchlistClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onWatchlistToggle?.(movie.id);
  };

  return (
    <Card className={cn(
      "group overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-elevated bg-gradient-card border-border/50",
      className
    )}>
      <Link to={`/movies/${movie.id}`}>
        <div className="aspect-[2/3] relative overflow-hidden bg-muted">
          {movie.poster_url ? (
            <img
              src={movie.poster_url}
              alt={`${movie.title} poster`}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-dark">
              <span className="text-muted-foreground text-center p-4">
                No poster available
              </span>
            </div>
          )}
          
          {/* Watchlist button overlay */}
          {onWatchlistToggle && (
            <Button
              size="sm"
              variant="secondary"
              className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-background/80 backdrop-blur-sm"
              onClick={handleWatchlistClick}
            >
              {isInWatchlist ? (
                <BookmarkCheck size={16} className="text-primary" />
              ) : (
                <Bookmark size={16} />
              )}
            </Button>
          )}
        </div>

        <CardContent className="p-4">
          <h3 className="font-semibold text-lg line-clamp-2 mb-2 group-hover:text-primary transition-colors">
            {movie.title}
          </h3>
          
          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
            <div className="flex items-center gap-1">
              <Calendar size={14} />
              <span>{movie.release_year}</span>
            </div>
            {movie.runtime && (
              <div className="flex items-center gap-1">
                <Clock size={14} />
                <span>{movie.runtime}m</span>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-1 mb-3">
            {movie.genre.slice(0, 2).map((g) => (
              <Badge key={g} variant="secondary" className="text-xs">
                {g}
              </Badge>
            ))}
            {movie.genre.length > 2 && (
              <Badge variant="outline" className="text-xs">
                +{movie.genre.length - 2}
              </Badge>
            )}
          </div>

          <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
            {movie.synopsis}
          </p>

          <div className="flex items-center justify-between">
            <StarRating rating={movie.average_rating} size={16} />
            <span className="text-xs text-muted-foreground">
              {movie.total_reviews} review{movie.total_reviews !== 1 ? 's' : ''}
            </span>
          </div>
        </CardContent>

        <CardFooter className="p-4 pt-0">
          <p className="text-sm text-muted-foreground">
            Directed by <span className="text-foreground font-medium">{movie.director}</span>
          </p>
        </CardFooter>
      </Link>
    </Card>
  );
}