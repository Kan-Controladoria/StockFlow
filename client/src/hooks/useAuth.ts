import { useState, useEffect } from 'react'
import type { Profile } from '@shared/schema'

// Simple authentication using local storage and backend profiles
export function useAuth() {
  const [user, setUser] = useState<{ id: string; email: string } | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check for stored authentication
    const storedUser = localStorage.getItem('auth_user')
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser)
        setUser(user)
        loadProfile(user.id)
      } catch (error) {
        console.error('Error parsing stored user:', error)
        localStorage.removeItem('auth_user')
        setLoading(false)
      }
    } else {
      // Auto-login with default admin for demo
      autoLoginAdmin()
    }
  }, [])

  const autoLoginAdmin = async () => {
    try {
      // Get the default admin profile
      const response = await fetch('/api/profiles')
      if (response.ok) {
        const profiles = await response.json()
        // Try to find admin by email first, then by role
        let adminProfile = profiles.find((p: any) => p.email === 'admin@supermarket.com')
        if (!adminProfile) {
          adminProfile = profiles.find((p: any) => p.role === 'admin')
        }
        
        if (adminProfile) {
          const user = { 
            id: adminProfile.id, 
            email: adminProfile.email || 'admin@supermarket.com' 
          }
          setUser(user)
          setProfile(adminProfile)
          localStorage.setItem('auth_user', JSON.stringify(user))
        }
      }
    } catch (error) {
      console.error('Error auto-logging in admin:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadProfile = async (userId: string) => {
    try {
      const response = await fetch(`/api/profiles/${userId}`)
      if (response.ok) {
        const profileData = await response.json()
        setProfile(profileData)
      } else {
        console.error('Error loading profile: Profile not found')
      }
    } catch (error) {
      console.error('Error loading profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const signIn = async (email: string, password: string) => {
    try {
      // Simple sign-in by email lookup (no password validation for demo)
      const response = await fetch('/api/profiles')
      if (response.ok) {
        const profiles = await response.json()
        
        // Check for direct email match first (if the profile has email field)
        let matchingProfile = profiles.find((p: any) => p.email === email)
        
        // Fallback: allow login with teste@empresa.com for any admin profile
        if (!matchingProfile && email === 'teste@empresa.com') {
          matchingProfile = profiles.find((p: any) => p.role === 'admin' || p.nome)
        }
        
        if (matchingProfile) {
          // Create user object with email and id
          const user = { 
            id: matchingProfile.id, 
            email: matchingProfile.email || email // Use provided email if profile doesn't have one
          }
          setUser(user)
          setProfile(matchingProfile)
          localStorage.setItem('auth_user', JSON.stringify(user))
          return { data: { user }, error: null }
        } else {
          return { data: null, error: { message: 'User not found' } }
        }
      } else {
        return { data: null, error: { message: 'Server error' } }
      }
    } catch (error) {
      return { data: null, error: { message: 'Network error' } }
    }
  }

  const signOut = async () => {
    try {
      setUser(null)
      setProfile(null)
      localStorage.removeItem('auth_user')
      return { error: null }
    } catch (error) {
      return { error: { message: 'Sign out failed' } }
    }
  }

  return {
    user,
    profile,
    loading,
    signIn,
    signOut,
  }
}
