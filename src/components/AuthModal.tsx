import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, User, Sparkles, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export function AuthModal() {
  const { signIn, signUp, signInWithApple } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: ''
  });
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await signIn(formData.email, formData.password);
        if (error) {
          setError(error.message);
        }
      } else {
        const { error } = await signUp(formData.email, formData.password, formData.name);
        if (error) {
          setError(error.message);
        } else {
          setSuccessMessage('Check your email to confirm your account!');
        }
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    setError(null);
    setLoading(true);

    try {
      const { error } = await signInWithApple();
      if (error) {
        setError(error.message);
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const inputClasses = "w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 pl-12 text-gray-700 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white/40 focus:border-transparent transition-all duration-300";

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-sky-400/90 via-purple-300/90 to-amber-200/90 backdrop-blur-xl">
      {/* Animated background particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 bg-white/30 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -30, 0],
              opacity: [0.2, 0.8, 0.2],
              scale: [1, 1.5, 1],
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>

      {/* Main auth card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", damping: 20, stiffness: 300 }}
        className="relative w-full max-w-md mx-4 z-10"
      >
        {/* Glow effect behind card */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-br from-amber-300/40 via-sky-300/40 to-purple-400/40 rounded-3xl blur-3xl"
          animate={{
            scale: [1, 1.05, 1],
            opacity: [0.6, 0.8, 0.6],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        {/* Glass card */}
        <div className="relative glass-strong rounded-3xl p-8 shadow-2xl border border-white/30">
          {/* Header with icon */}
          <motion.div
            className="flex flex-col items-center mb-8"
            animate={{
              y: [0, -5, 0],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <motion.div
              className="relative mb-4"
              whileHover={{ scale: 1.1, rotate: 5 }}
            >
              <motion.div
                className="absolute inset-0 bg-gradient-to-br from-amber-300 via-sky-300 to-purple-400 rounded-2xl blur-xl opacity-60"
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.4, 0.7, 0.4],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                }}
              />
              <div className="relative bg-white/20 rounded-2xl p-4 text-5xl">
                🙏
              </div>
            </motion.div>
            
            <h1 className="text-3xl text-gray-800 mb-2 font-bold">
              PrayerMap
            </h1>
            <p className="text-gray-600 text-center">
              Prayer. Shared.
            </p>
          </motion.div>

          {/* Toggle buttons */}
          <div className="flex gap-2 mb-6 bg-white/10 rounded-2xl p-1">
            <button
              type="button"
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-3 rounded-xl transition-all duration-300 ${
                isLogin
                  ? 'bg-white/30 text-gray-800 shadow-lg'
                  : 'text-gray-600 hover:text-gray-700'
              }`}
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-3 rounded-xl transition-all duration-300 ${
                !isLogin
                  ? 'bg-white/30 text-gray-800 shadow-lg'
                  : 'text-gray-600 hover:text-gray-700'
              }`}
            >
              Sign Up
            </button>
          </div>

          {/* Error message */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex items-center gap-2 p-3 bg-red-500/20 border border-red-500/30 rounded-xl text-red-700 text-sm"
              >
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Success message */}
          <AnimatePresence>
            {successMessage && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex items-center gap-2 p-3 bg-green-500/20 border border-green-500/30 rounded-xl text-green-700 text-sm"
              >
                <Sparkles className="w-4 h-4 flex-shrink-0" />
                <span>{successMessage}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <AnimatePresence mode="wait">
              {!isLogin && (
                <motion.div
                  initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                  animate={{ opacity: 1, height: 'auto', marginBottom: 16 }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  transition={{ duration: 0.3 }}
                  className="relative"
                >
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <motion.input
                    type="text"
                    placeholder="First Name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    onFocus={() => setFocusedField('name')}
                    onBlur={() => setFocusedField(null)}
                    className={inputClasses}
                    required={!isLogin}
                    animate={{
                      boxShadow: focusedField === 'name' 
                        ? '0 0 30px rgba(255, 255, 255, 0.3)' 
                        : '0 0 0px rgba(255, 255, 255, 0)',
                    }}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <motion.input
                type="email"
                placeholder="Email Address"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
                className={inputClasses}
                required
                animate={{
                  boxShadow: focusedField === 'email' 
                    ? '0 0 30px rgba(255, 255, 255, 0.3)' 
                    : '0 0 0px rgba(255, 255, 255, 0)',
                }}
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <motion.input
                type="password"
                placeholder="Password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
                className={inputClasses}
                required
                animate={{
                  boxShadow: focusedField === 'password' 
                    ? '0 0 30px rgba(255, 255, 255, 0.3)' 
                    : '0 0 0px rgba(255, 255, 255, 0)',
                }}
              />
            </div>

            {/* Submit button */}
            <motion.button
              type="submit"
              disabled={loading}
              className="relative w-full py-4 mt-6 rounded-xl overflow-hidden group disabled:opacity-50 disabled:cursor-not-allowed"
              whileHover={!loading ? { scale: 1.02 } : {}}
              whileTap={!loading ? { scale: 0.98 } : {}}
            >
              {/* Animated gradient background */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-amber-400 via-sky-400 to-purple-500"
                animate={{
                  backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "linear",
                }}
                style={{
                  backgroundSize: '200% 200%',
                }}
              />

              {/* Button glow on hover */}
              <motion.div
                className="absolute inset-0 bg-white/0 group-hover:bg-white/20 transition-all duration-300"
              />

              {/* Button content */}
              <span className="relative flex items-center justify-center gap-2 text-white font-semibold">
                {loading ? (
                  <>
                    <motion.div
                      className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    />
                    {isLogin ? 'Signing in...' : 'Creating account...'}
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    {isLogin ? 'Enter PrayerMap' : 'Join PrayerMap'}
                    <Sparkles className="w-5 h-5" />
                  </>
                )}
              </span>
            </motion.button>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/20"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-transparent text-gray-500">or</span>
              </div>
            </div>

            {/* Sign in with Apple */}
            <motion.button
              type="button"
              onClick={handleAppleSignIn}
              disabled={loading}
              className="relative w-full py-4 rounded-xl overflow-hidden group bg-black hover:bg-gray-900 transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              whileHover={!loading ? { scale: 1.02 } : {}}
              whileTap={!loading ? { scale: 0.98 } : {}}
            >
              <span className="relative flex items-center justify-center gap-3 text-white font-semibold">
                {loading ? (
                  <>
                    <motion.div
                      className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    />
                    Signing in...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                    </svg>
                    Sign in with Apple
                  </>
                )}
              </span>
            </motion.button>
          </form>

          {/* Footer text */}
          <motion.p
            className="text-center text-gray-500 text-sm mt-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            {isLogin ? "New to PrayerMap? " : "Already have an account? "}
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-gray-700 hover:text-gray-800 underline transition-colors"
            >
              {isLogin ? "Sign up" : "Login"}
            </button>
          </motion.p>
        </div>
      </motion.div>

      {/* Decorative light rays */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={`ray-${i}`}
            className="absolute top-0 left-1/2 w-1 bg-gradient-to-b from-white/20 to-transparent"
            style={{
              height: '100%',
              transformOrigin: 'top center',
              rotate: `${i * 60}deg`,
            }}
            animate={{
              opacity: [0.1, 0.3, 0.1],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              delay: i * 0.3,
            }}
          />
        ))}
      </div>
    </div>
  );
}