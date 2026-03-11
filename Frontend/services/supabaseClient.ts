import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ccmumugekmfplvkyuzuw.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNjbXVtdWdla21mcGx2a3l1enV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4NDQzNzUsImV4cCI6MjA4NTQyMDM3NX0.uA5axc51lGJVQ6D6t3bVsXR-7r40jIN76AXTpiDY3O4';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Sign up a new user
export const signUp = async (email: string, password: string, username?: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { username: username || email.split('@')[0] }
    }
  });
  if (error) throw error;
  return data;
};

// Sign in existing user
export const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  if (error) throw error;
  return data;
};

// Sign out
export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

// Get current user
export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
};

// Check if user is admin - uses RPC function for security
export const isAdmin = async (userId: string): Promise<boolean> => {
  try {
    // First try RPC function
    const { data, error } = await supabase.rpc('check_is_admin', { user_id: userId });
    if (!error && data !== null) return data;
    
    // Fallback: direct query (works if user is already admin)
    const { data: adminData } = await supabase
      .from('admins')
      .select('id')
      .eq('id', userId)
      .maybeSingle();
    
    return !!adminData;
  } catch {
    return false;
  }
};

// Save assessment to database
export const saveAssessment = async (assessment: {
  stress_level: number;
  reaction_time: number;
  memory_score: number;
  tapping_speed: number;
  accuracy: number;
  analysis?: object;
}) => {
  const user = await getCurrentUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('assessments')
    .insert({
      user_id: user.id,
      ...assessment
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Get user's assessments
export const getAssessments = async () => {
  const user = await getCurrentUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('assessments')
    .select('*')
    .eq('user_id', user.id)
    .order('timestamp', { ascending: false });

  if (error) throw error;
  return data;
};

// Get all assessments (admin only)
export const getAllAssessments = async () => {
  const { data, error } = await supabase
    .from('assessments')
    .select('*, profiles(username, display_name)')
    .order('timestamp', { ascending: false });

  if (error) throw error;
  return data;
};

// Delete assessment
export const deleteAssessment = async (id: string) => {
  const { error } = await supabase
    .from('assessments')
    .delete()
    .eq('id', id);

  if (error) throw error;
};

// Get user profile
export const getProfile = async () => {
  const user = await getCurrentUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error) throw error;
  return data;
};

// Update user profile
export const updateProfile = async (updates: { display_name?: string; username?: string }) => {
  const user = await getCurrentUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', user.id)
    .select()
    .single();

  if (error) throw error;
  return data;
};