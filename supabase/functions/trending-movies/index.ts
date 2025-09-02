import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const tmdbApiKey = Deno.env.get('TMDB_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TMDBMovie {
  id: number;
  title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  genre_ids: number[];
  vote_average: number;
  vote_count: number;
}

interface TMDBTrendingResponse {
  results: TMDBMovie[];
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!tmdbApiKey) {
      return new Response(JSON.stringify({ error: 'TMDB API key not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get trending movies from TMDB API
    const trendingUrl = `https://api.themoviedb.org/3/trending/movie/week?api_key=${tmdbApiKey}`;
    
    const response = await fetch(trendingUrl);
    
    if (!response.ok) {
      throw new Error(`TMDB API error: ${response.status}`);
    }

    const data: TMDBTrendingResponse = await response.json();

    // Transform TMDB data to our format
    const movies = data.results.slice(0, 20).map(movie => ({
      id: movie.id.toString(),
      title: movie.title,
      synopsis: movie.overview || 'No synopsis available',
      poster_url: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : null,
      backdrop_url: movie.backdrop_path ? `https://image.tmdb.org/t/p/w1280${movie.backdrop_path}` : null,
      release_year: movie.release_date ? new Date(movie.release_date).getFullYear() : null,
      average_rating: Math.round(movie.vote_average * 10) / 10,
      total_reviews: movie.vote_count,
      genre_ids: movie.genre_ids,
      external_id: movie.id // Store TMDB ID for reference
    }));

    return new Response(JSON.stringify({ movies }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in trending-movies function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});