-- Add foreign key constraint between reviews and profiles tables
ALTER TABLE public.reviews 
ADD CONSTRAINT reviews_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) 
ON DELETE CASCADE;