-- Update movies with poster URLs (using placeholder image service)
UPDATE public.movies 
SET poster_url = CASE 
  WHEN title = 'The Shawshank Redemption' THEN 'https://image.tmdb.org/t/p/w500/9cqNxx0GxF0bflyCy3FpPiy3BXg.jpg'
  WHEN title = 'The Godfather' THEN 'https://image.tmdb.org/t/p/w500/3bhkrj58Vtu7enYsRolD1fZdja1.jpg'
  WHEN title = 'The Dark Knight' THEN 'https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg'
  WHEN title = 'Pulp Fiction' THEN 'https://image.tmdb.org/t/p/w500/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg'
  WHEN title = 'Inception' THEN 'https://image.tmdb.org/t/p/w500/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg'
  ELSE 'https://via.placeholder.com/500x750/1a1a1a/ffd700?text=' || REPLACE(title, ' ', '+')
END;