// supabaseClient.js
const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

// Only exit if we're in production and missing required variables
if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase environment variables. Please check your .env file.");
  if (process.env.NODE_ENV === 'production') {
    console.error("Exiting due to missing environment variables in production.");
    process.exit(1);
  } else {
    console.warn("Supabase client will not be available due to missing environment variables.");
  }
}

// Create supabase client only if environment variables are available
const supabase = supabaseUrl && supabaseKey 
  ? createClient(supabaseUrl, supabaseKey)
  : null;

module.exports = supabase;
