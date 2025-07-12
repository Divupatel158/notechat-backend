// Test file to verify build process
console.log('Testing module imports...');

try {
  require('./index.js');
  console.log('✅ index.js imported successfully');
} catch (error) {
  console.error('❌ Error importing index.js:', error.message);
}

try {
  require('./supabaseClient.js');
  console.log('✅ supabaseClient.js imported successfully');
} catch (error) {
  console.error('❌ Error importing supabaseClient.js:', error.message);
}

try {
  require('./routes/auth.js');
  console.log('✅ auth.js imported successfully');
} catch (error) {
  console.error('❌ Error importing auth.js:', error.message);
}

try {
  require('./routes/notes.js');
  console.log('✅ notes.js imported successfully');
} catch (error) {
  console.error('❌ Error importing notes.js:', error.message);
}

console.log('Build test completed'); 