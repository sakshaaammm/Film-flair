import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { StarRating } from '@/components/ui/star-rating';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { User, Edit3, Save, X, Calendar, Star, Bookmark, Film } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Profile {
  id: string;
  user_id: string;
  username: string;
  display_name: string;
  bio?: string;
  avatar_url?: string;
  favorite_genres: string[];
  created_at: string;
  updated_at: string;
}

interface Review {
  id: string;
  rating: number;
  review_text?: string;
  created_at: string;
  movies: {
    id: string;
    title: string;
    poster_url?: string;
  };
}

interface Stats {
  total_reviews: number;
  average_rating: number;
  watchlist_count: number;
  favorite_genre: string;
}

export default function Profile() {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [recentReviews, setRecentReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<Stats>({
    total_reviews: 0,
    average_rating: 0,
    watchlist_count: 0,
    favorite_genre: ''
  });
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    display_name: '',
    bio: '',
    favorite_genres: [] as string[]
  });

  const allGenres = ['Action', 'Adventure', 'Animation', 'Comedy', 'Crime', 'Drama', 'Family', 'Fantasy', 'Horror', 'Mystery', 'Romance', 'Sci-Fi', 'Thriller', 'War'];

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchRecentReviews();
      fetchStats();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      setProfile(data);
      if (data) {
        setFormData({
          display_name: data.display_name || '',
          bio: data.bio || '',
          favorite_genres: data.favorite_genres || []
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const fetchRecentReviews = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('reviews')
        .select(`
          *,
          movies (id, title, poster_url)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(6);

      if (error) throw error;
      setRecentReviews(data || []);
    } catch (error) {
      console.error('Error fetching reviews:', error);
    }
  };

  const fetchStats = async () => {
    if (!user) return;

    try {
      // Get review stats
      const { data: reviewData } = await supabase
        .from('reviews')
        .select('rating')
        .eq('user_id', user.id);

      // Get watchlist count
      const { count: watchlistCount } = await supabase
        .from('watchlist')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      // Calculate stats
      const totalReviews = reviewData?.length || 0;
      const averageRating = totalReviews > 0 
        ? reviewData.reduce((sum, review) => sum + review.rating, 0) / totalReviews 
        : 0;

      setStats({
        total_reviews: totalReviews,
        average_rating: averageRating,
        watchlist_count: watchlistCount || 0,
        favorite_genre: profile?.favorite_genres?.[0] || ''
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    try {
      const profileData = {
        user_id: user.id,
        username: user.email?.split('@')[0] || '',
        display_name: formData.display_name,
        bio: formData.bio,
        favorite_genres: formData.favorite_genres
      };

      const { data, error } = await supabase
        .from('profiles')
        .upsert(profileData)
        .select()
        .single();

      if (error) throw error;
      
      setProfile(data);
      setEditing(false);
      toast({
        title: "Profile updated",
        description: "Your profile has been successfully updated.",
      });
    } catch (error) {
      console.error('Error saving profile:', error);
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    }
  };

  const toggleGenre = (genre: string) => {
    setFormData(prev => ({
      ...prev,
      favorite_genres: prev.favorite_genres.includes(genre)
        ? prev.favorite_genres.filter(g => g !== genre)
        : [...prev.favorite_genres, genre]
    }));
  };

  if (!user) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="text-center py-12">
          <User className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-2xl font-semibold mb-4">Sign in to view your profile</h2>
          <p className="text-muted-foreground mb-6">
            Create an account to track your movie reviews and watchlist.
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
          <div className="h-32 bg-muted rounded-lg"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="h-48 bg-muted rounded-lg"></div>
            <div className="h-48 bg-muted rounded-lg"></div>
            <div className="h-48 bg-muted rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <h1 className="text-4xl font-bold">
            My <span className="bg-gradient-gold bg-clip-text text-transparent">Profile</span>
          </h1>
          <Button onClick={signOut} variant="outline">
            Sign Out
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Information */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Profile Information</CardTitle>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => editing ? setEditing(false) : setEditing(true)}
                >
                  {editing ? <X className="h-4 w-4" /> : <Edit3 className="h-4 w-4" />}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {editing ? (
                <>
                  <div>
                    <Label htmlFor="display_name">Display Name</Label>
                    <Input
                      id="display_name"
                      value={formData.display_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, display_name: e.target.value }))}
                      placeholder="Your display name"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="bio">Bio</Label>
                    <Textarea
                      id="bio"
                      value={formData.bio}
                      onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                      placeholder="Tell us about yourself..."
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label>Favorite Genres</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {allGenres.map(genre => (
                        <Badge
                          key={genre}
                          variant={formData.favorite_genres.includes(genre) ? "default" : "outline"}
                          className="cursor-pointer"
                          onClick={() => toggleGenre(genre)}
                        >
                          {genre}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <Button onClick={handleSaveProfile} className="w-full">
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </Button>
                </>
              ) : (
                <>
                  <div>
                    <Label>Display Name</Label>
                    <p className="text-foreground">{profile?.display_name || 'Not set'}</p>
                  </div>
                  
                  <div>
                    <Label>Email</Label>
                    <p className="text-foreground">{user.email}</p>
                  </div>

                  <div>
                    <Label>Bio</Label>
                    <p className="text-foreground">{profile?.bio || 'No bio yet'}</p>
                  </div>

                  <div>
                    <Label>Favorite Genres</Label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {profile?.favorite_genres?.length ? (
                        profile.favorite_genres.map(genre => (
                          <Badge key={genre} variant="secondary">{genre}</Badge>
                        ))
                      ) : (
                        <span className="text-muted-foreground">None selected</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label>Member Since</Label>
                    <div className="flex items-center gap-2 text-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>{new Date(profile?.created_at || user.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Stats and Recent Activity */}
        <div className="lg:col-span-2 space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-6 text-center">
                <Star className="h-8 w-8 text-primary mx-auto mb-2" />
                <div className="text-2xl font-bold">{stats.total_reviews}</div>
                <div className="text-muted-foreground">Reviews</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 text-center">
                <div className="mx-auto mb-2">
                  <StarRating rating={stats.average_rating} size={20} />
                </div>
                <div className="text-2xl font-bold">{stats.average_rating.toFixed(1)}</div>
                <div className="text-muted-foreground">Avg Rating</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 text-center">
                <Bookmark className="h-8 w-8 text-primary mx-auto mb-2" />
                <div className="text-2xl font-bold">{stats.watchlist_count}</div>
                <div className="text-muted-foreground">Watchlist</div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Reviews */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Recent Reviews</CardTitle>
                <Link to="/my-reviews">
                  <Button variant="outline" size="sm">View All</Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {recentReviews.length > 0 ? (
                <div className="space-y-4">
                  {recentReviews.map((review) => (
                    <div key={review.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                      <div className="w-12 h-16 bg-muted rounded overflow-hidden flex-shrink-0">
                        {review.movies.poster_url ? (
                          <img
                            src={review.movies.poster_url}
                            alt={review.movies.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Film className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <Link 
                            to={`/movies/${review.movies.id}`}
                            className="font-medium hover:text-primary transition-colors"
                          >
                            {review.movies.title}
                          </Link>
                          <span className="text-xs text-muted-foreground">
                            {new Date(review.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <StarRating rating={review.rating} size={14} />
                        {review.review_text && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {review.review_text}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Star className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">No reviews yet</p>
                  <Link to="/movies">
                    <Button variant="outline" size="sm" className="mt-2">
                      Start Reviewing Movies
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}