import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, LogIn } from 'lucide-react';
import AuthLayout from '../components/AuthLayout';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';

// Beautiful travel image from Unsplash
const BG_IMAGE = "https://images.unsplash.com/photo-1499856871958-5b9627545d1a?q=80&w=2020&auto=format&fit=crop";

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
    console.log("Login with:", email, password);
    // TODO: Integrate Firebase Email/Password Auth
  };

  const handleGoogleLogin = async () => {
    setError('');
    try {
      const result = await signInWithPopup(auth, googleProvider);
      console.log("Successfully logged in as:", result.user.displayName);
      const token = await result.user.getIdToken();
      console.log("JWT Token to send to FastAPI:", token);
      
      navigate('/dashboard');
    } catch (err) {
      console.error("Google Login failed", err);
      setError("Failed to sign in with Google.");
    }
  };

  return (
    <AuthLayout 
      bgImage={BG_IMAGE}
      title="Welcome back"
      subtitle="Sign in to plan your next adventure"
    >
      <form onSubmit={handleLogin} className="space-y-5">
        
        {/* Email Field */}
        <div>
          <label className="block text-xs font-semibold text-white/80 uppercase tracking-wider mb-2">Email Address</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Mail className="h-5 w-5 text-white/50" />
            </div>
            <input 
              type="email" 
              className="w-full pl-10 pr-4 py-3 bg-overlay border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
        </div>

        {/* Password Field */}
        <div>
          <label className="block text-xs font-semibold text-white/80 uppercase tracking-wider mb-2">Password</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock className="h-5 w-5 text-white/50" />
            </div>
            <input 
              type="password" 
              className="w-full pl-10 pr-4 py-3 bg-overlay border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
        </div>

        {/* Login Button */}
        <button 
          type="submit" 
          className="w-full py-3 px-4 bg-base hover:bg-[#112240] text-white rounded-xl font-medium transition-colors flex items-center justify-center group"
        >
          <span>Login</span>
          <LogIn className="ml-2 h-4 w-4 transform group-hover:translate-x-1 transition-transform" />
        </button>

        {/* Divider */}
        <div className="flex items-center my-6">
          <div className="flex-1 border-t border-white/20"></div>
          <span className="px-3 text-white/50 text-sm">OR</span>
          <div className="flex-1 border-t border-white/20"></div>
        </div>

        {/* Google Login Button */}
        <button 
          type="button" 
          onClick={handleGoogleLogin}
          className="w-full py-3 px-4 bg-white hover:bg-gray-50 text-gray-900 rounded-xl font-medium transition-colors flex items-center justify-center"
        >
          <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </button>

      </form>

      {/* Footer link */}
      <div className="mt-8 text-center text-sm text-white/80">
        Don't have an account? <Link to="/signup" className="text-white font-semibold hover:underline">Sign up</Link>
      </div>
    </AuthLayout>
  );
};

export default Login;
