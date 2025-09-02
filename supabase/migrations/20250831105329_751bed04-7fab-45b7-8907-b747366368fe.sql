-- Create movies table
CREATE TABLE public.movies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  genre TEXT[] NOT NULL DEFAULT '{}',
  release_year INTEGER NOT NULL,
  director TEXT NOT NULL,
  cast TEXT[] NOT NULL DEFAULT '{}',
  synopsis TEXT NOT NULL,
  poster_url TEXT,
  trailer_url TEXT,
  runtime INTEGER, -- in minutes
  average_rating DECIMAL(3,2) DEFAULT 0.00,
  total_reviews INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create profiles table for additional user information
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  favorite_genres TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create reviews table
CREATE TABLE public.reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  movie_id UUID NOT NULL REFERENCES public.movies(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, movie_id) -- One review per user per movie
);

-- Create watchlist table
CREATE TABLE public.watchlist (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  movie_id UUID NOT NULL REFERENCES public.movies(id) ON DELETE CASCADE,
  added_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, movie_id) -- Prevent duplicate entries
);

-- Enable Row Level Security
ALTER TABLE public.movies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watchlist ENABLE ROW LEVEL SECURITY;

-- RLS Policies for movies (public read, admin write)
CREATE POLICY "Movies are viewable by everyone" 
ON public.movies 
FOR SELECT 
USING (true);

-- RLS Policies for profiles
CREATE POLICY "Profiles are viewable by everyone" 
ON public.profiles 
FOR SELECT 
USING (true);

CREATE POLICY "Users can create their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

-- RLS Policies for reviews
CREATE POLICY "Reviews are viewable by everyone" 
ON public.reviews 
FOR SELECT 
USING (true);

CREATE POLICY "Users can create their own reviews" 
ON public.reviews 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reviews" 
ON public.reviews 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reviews" 
ON public.reviews 
FOR DELETE 
USING (auth.uid() = user_id);

-- RLS Policies for watchlist
CREATE POLICY "Users can view their own watchlist" 
ON public.watchlist 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can add to their own watchlist" 
ON public.watchlist 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove from their own watchlist" 
ON public.watchlist 
FOR DELETE 
USING (auth.uid() = user_id);

-- Function to update movie average rating
CREATE OR REPLACE FUNCTION update_movie_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.movies 
  SET 
    average_rating = (
      SELECT COALESCE(AVG(rating::DECIMAL), 0) 
      FROM public.reviews 
      WHERE movie_id = COALESCE(NEW.movie_id, OLD.movie_id)
    ),
    total_reviews = (
      SELECT COUNT(*) 
      FROM public.reviews 
      WHERE movie_id = COALESCE(NEW.movie_id, OLD.movie_id)
    )
  WHERE id = COALESCE(NEW.movie_id, OLD.movie_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Triggers to update movie ratings
CREATE TRIGGER update_movie_rating_on_insert
AFTER INSERT ON public.reviews
FOR EACH ROW EXECUTE FUNCTION update_movie_rating();

CREATE TRIGGER update_movie_rating_on_update
AFTER UPDATE ON public.reviews
FOR EACH ROW EXECUTE FUNCTION update_movie_rating();

CREATE TRIGGER update_movie_rating_on_delete
AFTER DELETE ON public.reviews
FOR EACH ROW EXECUTE FUNCTION update_movie_rating();

-- Function to handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, username, display_name)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user profile creation
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for automatic timestamp updates
CREATE TRIGGER update_movies_updated_at
BEFORE UPDATE ON public.movies
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_reviews_updated_at
BEFORE UPDATE ON public.reviews
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some sample movies
INSERT INTO public.movies (title, genre, release_year, director, cast, synopsis, runtime) VALUES
('The Shawshank Redemption', ARRAY['Drama'], 1994, 'Frank Darabont', ARRAY['Tim Robbins', 'Morgan Freeman'], 'Two imprisoned men bond over a number of years, finding solace and eventual redemption through acts of common decency.', 142),
('The Godfather', ARRAY['Crime', 'Drama'], 1972, 'Francis Ford Coppola', ARRAY['Marlon Brando', 'Al Pacino'], 'The aging patriarch of an organized crime dynasty transfers control of his clandestine empire to his reluctant son.', 175),
('The Dark Knight', ARRAY['Action', 'Crime', 'Drama'], 2008, 'Christopher Nolan', ARRAY['Christian Bale', 'Heath Ledger'], 'When the menace known as the Joker wreaks havoc and chaos on the people of Gotham, Batman must accept one of the greatest psychological and physical tests.', 152),
('Pulp Fiction', ARRAY['Crime', 'Drama'], 1994, 'Quentin Tarantino', ARRAY['John Travolta', 'Uma Thurman', 'Samuel L. Jackson'], 'The lives of two mob hitmen, a boxer, a gangster and his wife intertwine in four tales of violence and redemption.', 154),
('Inception', ARRAY['Action', 'Sci-Fi', 'Thriller'], 2010, 'Christopher Nolan', ARRAY['Leonardo DiCaprio', 'Marion Cotillard'], 'A thief who steals corporate secrets through dream-sharing technology is given the inverse task of planting an idea into a CEO''s mind.', 148);