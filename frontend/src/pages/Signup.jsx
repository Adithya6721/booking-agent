import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Mail, Lock, ArrowRight } from 'lucide-react';
import AuthLayout from '../components/AuthLayout';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';

// Beautiful snowy mountain travel image for signup
const BG_IMAGE = "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?q=80&w=2070&auto=format&fit=crop";

const Signup = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSignup = (e) => {
    e.preventDefault();
    console.log("Signup with:", username, email, password);
    // TODO: Integrate Firebase Email/Password Auth
  };

  const handleGoogleSignup = async () => {
    setError('');
    try {
      const result = await signInWithPopup(auth, googleProvider);
      console.log("Successfully signed up as:", result.user.displayName);
      const token = await result.user.getIdToken();
      console.log("JWT Token to send to FastAPI:", token);
      
      alert(`Welcome ${result.user.displayName}! Account created successfully.`);
    } catch (err) {
      console.error("Google Signup failed", err);
      setError("Failed to sign up with Google.");
    }
  };

  return (
    <AuthLayout 
      bgImage={BG_IMAGE}
      title="Start your journey"
      subtitle="Create an account in seconds"
    >
      <form onSubmit={handleSignup} className="space-y-5">
        
        {/* Username Field */}
        <div>
          <label className="block text-xs font-semibold text-white/80 uppercase tracking-wider mb-2">Username</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <User className="h-5 w-5 text-white/50" />
            </div>
            <input 
              type="text" 
              className="w-full pl-10 pr-4 py-3 bg-overlay border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all"
              placeholder="Choose a username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
        </div>

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

        {/* Signup Button */}
        <button 
          type="submit" 
          className="w-full py-3 px-4 bg-base hover:bg-[#112240] text-white rounded-xl font-medium transition-colors flex items-center justify-center group"
        >
          <span>Create Account</span>
          <ArrowRight className="ml-2 h-4 w-4 transform group-hover:translate-x-1 transition-transform" />
        </button>

      </form>

      {/* Footer link */}
      <div className="mt-8 text-center text-sm text-white/80">
        Already have an account? <Link to="/login" className="text-white font-semibold hover:underline">Sign in</Link>
      </div>
    </AuthLayout>
  );
};

export default Signup;
