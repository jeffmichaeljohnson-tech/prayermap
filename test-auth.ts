/**
 * Test Authentication Script
 * 
 * Run this with: npx tsx test-auth.ts
 * Or: ts-node test-auth.ts
 * 
 * Make sure to install tsx: npm install -D tsx
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://oomrmfhvsxtxgqqthisz.supabase.co'
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9vbXJtZmh2c3h0eGdxcXRoaXN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0ODcyNDIsImV4cCI6MjA3OTA2MzI0Mn0.5MxjbSa0yaBbMcEuxxlTXu8dM3fenl0ZzDXheSMd7C8'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testAuthentication() {
  console.log('🔐 Testing Supabase Authentication\n')
  console.log('Project URL:', supabaseUrl)
  console.log('---\n')

  // Test 1: Sign up a test user
  // Using a standard email format that should pass validation
  const testEmail = `testuser${Date.now()}@gmail.com`
  const testPassword = 'TestPassword123!'

  console.log('1️⃣ Testing Sign Up...')
  console.log(`   Email: ${testEmail}`)
  
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email: testEmail,
    password: testPassword,
  })

  if (signUpError) {
    console.error('   ❌ Sign Up Error:', signUpError.message)
    return
  }

  console.log('   ✅ Sign Up Successful!')
  console.log('   User ID:', signUpData.user?.id)
  console.log('   Email:', signUpData.user?.email)
  
  // Check if email confirmation is required
  if (signUpData.user && !signUpData.session) {
    console.log('   ⚠️  Email confirmation required')
    console.log('   💡 Tip: Disable email confirmation in Auth settings for testing')
    console.log('   💡 Or use the confirmation link sent to your email')
    console.log('')
    console.log('   Skipping sign-in test (email not confirmed)')
    console.log('   ✅ Sign up test passed!')
    return
  }
  
  console.log('')

  // Test 2: Sign in
  console.log('2️⃣ Testing Sign In...')
  
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: testEmail,
    password: testPassword,
  })

  if (signInError) {
    console.error('   ❌ Sign In Error:', signInError.message)
    if (signInError.message.includes('not confirmed')) {
      console.log('   💡 Disable email confirmation in Auth settings for testing')
    }
    return
  }

  console.log('   ✅ Sign In Successful!')
  console.log('   User ID:', signInData.user?.id)
  console.log('   Session Token:', signInData.session?.access_token?.substring(0, 20) + '...')
  console.log('')

  // Test 3: Get current user
  console.log('3️⃣ Testing Get Current User...')
  
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError) {
    console.error('   ❌ Get User Error:', userError.message)
    return
  }

  console.log('   ✅ Current User Retrieved!')
  console.log('   User ID:', user?.id)
  console.log('   Email:', user?.email)
  console.log('')

  // Test 4: Sign out
  console.log('4️⃣ Testing Sign Out...')
  
  const { error: signOutError } = await supabase.auth.signOut()

  if (signOutError) {
    console.error('   ❌ Sign Out Error:', signOutError.message)
    return
  }

  console.log('   ✅ Sign Out Successful!')
  console.log('')

  console.log('🎉 All authentication tests passed!')
  
  // Test 5: Create user profile (required by schema)
  if (signInData?.user) {
    console.log('')
    console.log('5️⃣ Testing User Profile Creation...')
    
    const { data: profileData, error: profileError } = await supabase
      .from('users')
      .insert({
        user_id: signInData.user.id,
        first_name: 'Test',
        last_name: 'User',
        email: testEmail
      })
      .select()
      .single()
    
    if (profileError) {
      if (profileError.code === '23505') {
        console.log('   ✅ Profile already exists (expected if user was created before)')
      } else {
        console.error('   ❌ Profile Creation Error:', profileError.message)
      }
    } else {
      console.log('   ✅ Profile Created Successfully!')
      console.log('   User ID:', profileData.user_id)
      console.log('   Name:', profileData.first_name, profileData.last_name)
    }
  }
}

testAuthentication().catch(console.error)

