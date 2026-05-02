import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API_URL from './api';

export default function Login({ setUser }: { setUser: (user: any) => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!username || !password) {
      setError('Please fill in all fields');
      setLoading(false);
      return;
    }

    try {
      const endpoint = isLogin ? `${API_URL}/api/login` : `${API_URL}/api/register`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, role: 'staff' })
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Authentication failed');

      localStorage.setItem('token', data.token);
      setUser(data.user);
      navigate('/');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full p-8 bg-white rounded-2xl shadow-xl">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold">
            <span className="text-gray-600">Fresh</span>
            <span className="text-[#a4c71d]">Timesheets</span>
          </h2>
          <p className="text-gray-600 mt-2">
            {isLogin ? 'Sign in to your account' : 'Create a new account'}
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            ❌ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">Username</label>
            <input
              type="text"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#a4c71d] focus:border-transparent outline-none transition"
              required
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Password</label>
            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#a4c71d] focus:border-transparent outline-none transition"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#a4c71d] text-white py-3 rounded-lg font-bold hover:bg-[#8fb018] transition disabled:opacity-50 transform hover:scale-105"
          >
            {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Create Account')}
          </button>
        </form>

        <p className="text-center mt-6 text-sm text-gray-600">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError('');
            }}
            className="text-[#a4c71d] font-bold hover:underline"
          >
            {isLogin ? 'Register here' : 'Login here'}
          </button>
        </p>

        {isLogin && (
          <p className="text-center mt-4 text-xs text-gray-500">
            Default admin: admin / admin123
          </p>
        )}
      </div>
    </div>
  );
}
