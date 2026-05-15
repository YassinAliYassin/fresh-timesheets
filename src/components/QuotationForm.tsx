import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface QuotationData {
  name: string;
  email: string;
  company: string;
  service: string;
  hours: number;
  description: string;
}

const services = [
  'Software Development',
  'Web Development',
  'Mobile App Development',
  'UI/UX Design',
  'Consulting',
  'Other'
];

export default function QuotationForm() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<QuotationData>({
    name: '',
    email: '',
    company: '',
    service: '',
    hours: 0,
    description: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: name === 'hours' ? Number(value) : value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/quotations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) throw new Error('Failed to submit quotation');

      alert('Quotation submitted successfully!');
      navigate('/');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-sm p-8">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">Request a Quote</h2>
        <p className="text-gray-600">Fill out the form below and we'll get back to you within 24 hours.</p>
      </div>

      {error && <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Full Name *</label>
            <input type="text" name="name" value={formData.name} onChange={handleChange} required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#a4c71d] focus:border-transparent outline-none transition" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Email *</label>
            <input type="email" name="email" value={formData.email} onChange={handleChange} required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#a4c71d] focus:border-transparent outline-none transition" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Company</label>
          <input type="text" name="company" value={formData.company} onChange={handleChange}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#a4c71d] focus:border-transparent outline-none transition" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Service Required *</label>
            <select name="service" value={formData.service} onChange={handleChange} required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#a4c71d] focus:border-transparent outline-none transition bg-white">
              <option value="">Select a service</option>
              {services.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Estimated Hours</label>
            <input type="number" name="hours" value={formData.hours} onChange={handleChange} min="0"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#a4c71d] focus:border-transparent outline-none transition" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Project Description *</label>
          <textarea name="description" value={formData.description} onChange={handleChange} required rows={5}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#a4c71d] focus:border-transparent outline-none transition resize-none"
            placeholder="Describe your project requirements..."></textarea>
        </div>

        <button type="submit" disabled={loading}
          className="btn-primary w-full py-4 text-lg flex items-center justify-center gap-2 disabled:opacity-50">
          {loading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-paper-plane"></i>}
          {loading ? 'Submitting...' : 'Submit Quotation Request'}
        </button>
      </form>
    </div>
  );
}