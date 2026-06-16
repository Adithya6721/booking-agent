import React from 'react';

const AuthLayout = ({ children, bgImage, title, subtitle }) => {
  return (
    <div 
      className="min-h-screen w-full flex items-center justify-center bg-cover bg-center relative"
      style={{ backgroundImage: `url('${bgImage}')` }}
    >
      {/* Dark overlay for better readability */}
      <div className="absolute inset-0 bg-black/40"></div>
      
      {/* Central Glassmorphism Box */}
      <div className="relative z-10 w-full max-w-md p-8 sm:p-10 mx-4 glassmorphism">
        
        {/* Header Text */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm border border-white/30">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">{title}</h2>
          <p className="text-white/70">{subtitle}</p>
        </div>

        {/* Content (Forms) */}
        {children}
        
      </div>
    </div>
  );
};

export default AuthLayout;
