-- Idempotent movie app schema and policies
-- 1) Movies
CREATE TABLE IF NOT EXISTS public.movies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  genre TEXT[] NOT NULL DEFAULT '{}',
  release_year INTEGER NOT NULL,
  director TEXT NOT NULL,
  actors TEXT[] NOT NULL DEFAULT '{}',
  synopsis TEXT NOT NULL,
  poster_url TEXT,
  trailer_url TEXT,
  runtime INTEGER,
  average_rating DECIMAL(3,2) DEFAULT 0.00,
  total_reviews INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.movies ADD COLUMN IF NOT EXISTS actors TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE public.movies ADD COLUMN IF NOT EXISTS runtime INTEGER;
ALTER TABLE public.movies ADD COLUMN IF NOT EXISTS average_rating DECIMAL(3,2) DEFAULT 0.00;
ALTER TABLE public.movies ADD COLUMN IF NOT EXISTS total_reviews INTEGER DEFAULT 0;
ALTER TABLE public.movies ADD COLUMN IF NOT EXISTS poster_url TEXT;
ALTER TABLE public.movies ADD COLUMN IF NOT EXISTS trailer_url TEXT;
ALTER TABLE public.movies ADD COLUMN IF NOT EXISTS synopsis TEXT NOT NULL DEFAULT '';
ALTER TABLE public.movies ADD COLUMN IF NOT EXISTS genre TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE public.movies ADD COLUMN IF NOT EXISTS director TEXT NOT NULL DEFAULT '';
ALTER TABLE public.movies ADD COLUMN IF NOT EXISTS release_year INTEGER;

-- 2) Profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  favorite_genres TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3) Reviews
CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  movie_id UUID NOT NULL REFERENCES public.movies(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, movie_id)
);

-- 4) Watchlist
CREATE TABLE IF NOT EXISTS public.watchlist (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  movie_id UUID NOT NULL REFERENCES public.movies(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, movie_id)
);

-- Enable RLS (safe to run repeatedly)
ALTER TABLE public.movies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watchlist ENABLE ROW LEVEL SECURITY;

-- Policies (guard by existence)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='movies' AND policyname='Movies are viewable by everyone'
  ) THEN
    CREATE POLICY "Movies are viewable by everyone" ON public.movies FOR SELECT USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='profiles' AND policyname='Profiles are viewable by everyone'
  ) THEN
    CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='profiles' AND policyname='Users can create their own profile'
  ) THEN
    CREATE POLICY "Users can create their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='profiles' AND policyname='Users can update their own profile'
  ) THEN
    CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='reviews' AND policyname='Reviews are viewable by everyone'
  ) THEN
    CREATE POLICY "Reviews are viewable by everyone" ON public.reviews FOR SELECT USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='reviews' AND policyname='Users can create their own reviews'
  ) THEN
    CREATE POLICY "Users can create their own reviews" ON public.reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='reviews' AND policyname='Users can update their own reviews'
  ) THEN
    CREATE POLICY "Users can update their own reviews" ON public.reviews FOR UPDATE USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='reviews' AND policyname='Users can delete their own reviews'
  ) THEN
    CREATE POLICY "Users can delete their own reviews" ON public.reviews FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='watchlist' AND policyname='Users can view their own watchlist'
  ) THEN
    CREATE POLICY "Users can view their own watchlist" ON public.watchlist FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='watchlist' AND policyname='Users can add to their own watchlist'
  ) THEN
    CREATE POLICY "Users can add to their own watchlist" ON public.watchlist FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='watchlist' AND policyname='Users can remove from their own watchlist'
  ) THEN
    CREATE POLICY "Users can remove from their own watchlist" ON public.watchlist FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- Rating function and triggers
CREATE OR REPLACE FUNCTION public.update_movie_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.movies 
  SET 
    average_rating = (
      SELECT COALESCE(AVG(rating::DECIMAL), 0) FROM public.reviews WHERE movie_id = COALESCE(NEW.movie_id, OLD.movie_id)
    ),
    total_reviews = (
      SELECT COUNT(*) FROM public.reviews WHERE movie_id = COALESCE(NEW.movie_id, OLD.movie_id)
    )
  WHERE id = COALESCE(NEW.movie_id, OLD.movie_id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_movie_rating_on_insert') THEN
    CREATE TRIGGER update_movie_rating_on_insert AFTER INSERT ON public.reviews FOR EACH ROW EXECUTE FUNCTION public.update_movie_rating();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_movie_rating_on_update') THEN
    CREATE TRIGGER update_movie_rating_on_update AFTER UPDATE ON public.reviews FOR EACH ROW EXECUTE FUNCTION public.update_movie_rating();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_movie_rating_on_delete') THEN
    CREATE TRIGGER update_movie_rating_on_delete AFTER DELETE ON public.reviews FOR EACH ROW EXECUTE FUNCTION public.update_movie_rating();
  END IF;
END $$;

-- Timestamp helper and triggers
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_movies_updated_at') THEN
    CREATE TRIGGER update_movies_updated_at BEFORE UPDATE ON public.movies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_profiles_updated_at') THEN
    CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_reviews_updated_at') THEN
    CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON public.reviews FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- New user -> profile trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, username, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created') THEN
    CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
  END IF;
END $$;

-- Seed sample movies only if empty
INSERT INTO public.movies (title, genre, release_year, director, actors, synopsis, runtime)
SELECT * FROM (
  VALUES
  ('The Shawshank Redemption', ARRAY['Drama'], 1994, 'Frank Darabont', ARRAY['Tim Robbins','Morgan Freeman'], 'Two imprisoned men bond over years, finding solace and redemption.', 142),
  ('The Godfather', ARRAY['Crime','Drama'], 1972, 'Francis Ford Coppola', ARRAY['Marlon Brando','Al Pacino'], 'The aging patriarch of an organized crime dynasty transfers control to his son.', 175),
  ('The Dark Knight', ARRAY['Action','Crime','Drama'], 2008, 'Christopher Nolan', ARRAY['Christian Bale','Heath Ledger'], 'Batman faces the Joker''s chaos in Gotham.', 152),
  ('Pulp Fiction', ARRAY['Crime','Drama'], 1994, 'Quentin Tarantino', ARRAY['John Travolta','Uma Thurman','Samuel L. Jackson'], 'Interwoven tales of crime and redemption.', 154),
  ('Inception', ARRAY['Action','Sci-Fi','Thriller'], 2010, 'Christopher Nolan', ARRAY['Leonardo DiCaprio','Marion Cotillard'], 'A thief who steals secrets through dream-sharing is tasked with inception.', 148)
) AS v(title, genre, release_year, director, actors, synopsis, runtime)
WHERE NOT EXISTS (SELECT 1 FROM public.movies LIMIT 1);
