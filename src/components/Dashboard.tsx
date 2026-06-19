import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from './api';

interface DashboardStats {
  totalEvents: number;
  activeEvents: number;
  teamMembers: number;
  totalHours: number;
  totalBilling: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalEvents: 0,
    activeEvents: 0,
    teamMembers: 0,
    totalHours: 0,
    totalBilling: 0
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const data = await api.get('/api/stats');
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const quickActions = [
    { icon: 'fa-calendar', title: 'Events', desc: 'Manage schedules', link: '/events', color: 'bg-green-500' },
    { icon: 'fa-file-invoice-dollar', title: 'Billing', desc: 'Export invoices', link: '/billing', color: 'bg-purple-500' },
    { icon: 'fa-file-alt', title: 'Reports', desc: 'View analytics', link: '/reports', color: 'bg-orange-500' },
    { icon: 'fa-envelope', title: 'Notifications', desc: 'Email alerts', link: '/notifications', color: 'bg-red-500' },
    { icon: 'fa-file-signature', title: 'Quotation', desc: 'Request a quote', link: '/quotation', color: 'bg-[#a4c71d]' }
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-gray-800 mb-2">Dashboard</h2>
        <p className="text-gray-600">Welcome back! Here's your overview.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl shadow-sm p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <i className="fas fa-calendar-alt text-3xl text-green-500"></i>
            <span className="text-3xl font-bold text-gray-800">{stats.totalEvents}</span>
          </div>
          <h3 className="font-semibold text-gray-700">Total Events</h3>
          <p className="text-sm text-gray-500 mt-1">All time</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <i className="fas fa-clock text-3xl text-blue-500"></i>
            <span className="text-3xl font-bold text-gray-800">{stats.totalHours.toFixed(1)}</span>
          </div>
          <h3 className="font-semibold text-gray-700">Total Hours</h3>
          <p className="text-sm text-gray-500 mt-1">Logged hours</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <i className="fas fa-users text-3xl text-purple-500"></i>
            <span className="text-3xl font-bold text-gray-800">{stats.teamMembers}</span>
          </div>
          <h3 className="font-semibold text-gray-700">Team Members</h3>
          <p className="text-sm text-gray-500 mt-1">Active staff</p>
        </div>
      </div>

      {/* Billing Summary */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-700">Total Billing</h3>
            <p className="text-sm text-gray-500">All invoiced amounts</p>
          </div>
          <span className="text-3xl font-bold text-[#a4c71d]">R {stats.totalBilling.toFixed(2)}</span>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h3 className="text-xl font-bold text-gray-800 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {quickActions.map((action, idx) => (
            <Link key={idx} to={action.link}
              className="bg-white rounded-xl shadow-sm p-5 hover:shadow-md transition-all hover:-translate-y-1 group">
              <div className={`${action.color} w-12 h-12 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                <i className={`fas ${action.icon} text-white text-xl`}></i>
              </div>
              <h4 className="font-semibold text-gray-800 mb-1">{action.title}</h4>
              <p className="text-sm text-gray-500">{action.desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
