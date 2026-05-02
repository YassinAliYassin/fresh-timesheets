import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Login({ setUser }: { setUser: (user: any) => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const endpoint = isLogin ? '/api/login' : '/api/register';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, role: 'staff' })
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error);

      localStorage.setItem('token', data.token);
      setUser(data.user);
      navigate('/');
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-20 p-8 bg-white rounded-2xl shadow-xl">
      <h2 className="text-3xl font-bold mb-6 text-center">
        <span className="text-gray-600">Fresh</span>
        <span className="text-[#a4c71d]">Timesheets</span>
      </h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-[#a4c71d] outline-none"
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-[#a4c71d] outline-none"
          required
        />
        
        {error && <p className="text-red-500 text-sm">{error}</p>}
        
        <button
          type="submit"
          className="w-full bg-[#a4c71d] text-white py-3 rounded-lg font-bold hover:bg-[#8fb018] transition"
        >
          {isLogin ? 'Login' : 'Register'}
        </button>
      </form>

      <p className="text-center mt-4 text-sm text-gray-600">
        {isLogin ? "Don't have an account? " : "Already have an account? "}
        <button
          onClick={() => setIsLogin(!isLogin)}
          className="text-[#a4c71d] font-bold"
        >
          {isLogin ? 'Register' : 'Login'}
        </button>
      </p>
    </div>
  );
}
