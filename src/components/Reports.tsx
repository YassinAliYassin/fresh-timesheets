import { useState, useEffect } from 'react';
import api from './api';

export default function Reports() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchReportData();
  }, [dateRange]);

  const fetchReportData = async () => {
    setLoading(true);
    setError('');
    try {
      const [timesheetsData, eventsData] = await Promise.all([
        api.get('/api/timesheets'),
        api.get('/api/events'),
      ]);

      const allTimesheets = timesheetsData || [];
      const allEvents = eventsData || [];

      // Filter by date range
      const filteredTimesheets = allTimesheets.filter((t: any) => {
        const date = new Date(t.clock_in);
        return date >= new Date(dateRange.start) && date <= new Date(dateRange.end + 'T23:59:59');
      });

      const totalHours = filteredTimesheets.reduce((sum: number, t: any) => sum + (t.total_hours || 0), 0);
      const totalEvents = allEvents.length;
      const totalBilling = filteredTimesheets.reduce((sum: number, t: any) => sum + (t.total_amount || 0), 0);
      const uniqueDays = new Set(filteredTimesheets.map((t: any) => t.clock_in?.substring(0, 10))).size;
      const averageHoursPerDay = uniqueDays > 0 ? totalHours / uniqueDays : 0;

      // Top events by hours
      const eventHours: { [key: string]: number } = {};
      filteredTimesheets.forEach((t: any) => {
        const name = t.event_name || 'Unknown';
        eventHours[name] = (eventHours[name] || 0) + (t.total_hours || 0);
      });
      const topEvents = Object.entries(eventHours)
        .map(([name, hours]) => ({ name, hours: hours as number }))
        .sort((a, b) => b.hours - a.hours)
        .slice(0, 5);

      // Monthly trend
      const monthlyData: { [key: string]: number } = {};
      filteredTimesheets.forEach((t: any) => {
        const month = t.clock_in?.substring(0, 7) || 'unknown';
        monthlyData[month] = (monthlyData[month] || 0) + (t.total_hours || 0);
      });
      const monthlyTrend = Object.entries(monthlyData)
        .map(([month, hours]) => ({ month, hours: hours as number }))
        .sort((a, b) => a.month.localeCompare(b.month));

      // Store computed data as component state via a single object
      setComputedData({
        totalHours,
        totalEvents,
        totalBilling,
        averageHoursPerDay,
        topEvents,
        monthlyTrend
      });
    } catch (err: any) {
      setError(err.message || 'Failed to load report data');
    } finally {
      setLoading(false);
    }
  };

  const [computedData, setComputedData] = useState<any>(null);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#a4c71d]"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Reports & Analytics</h1>
        <p className="text-gray-600">Track your timesheet performance and trends</p>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Date Range Selector */}
      <div className="mb-6 bg-white rounded-lg shadow p-4">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#a4c71d]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#a4c71d]"
            />
          </div>
          <button
            onClick={fetchReportData}
            className="px-4 py-2 bg-[#a4c71d] text-white rounded-md hover:bg-[#8fb018] transition-colors font-semibold"
          >
            Update Report
          </button>
        </div>
      </div>

      {computedData && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-600">Total Hours</h3>
                <span className="text-2xl">⏱️</span>
              </div>
              <p className="text-3xl font-bold text-gray-900">{computedData.totalHours.toFixed(1)}</p>
              <p className="text-sm text-gray-500 mt-1">In selected period</p>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-600">Avg Hours/Day</h3>
                <span className="text-2xl">📊</span>
              </div>
              <p className="text-3xl font-bold text-gray-900">{computedData.averageHoursPerDay.toFixed(1)}</p>
              <p className="text-sm text-gray-500 mt-1">Per working day</p>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-600">Total Events</h3>
                <span className="text-2xl">📅</span>
              </div>
              <p className="text-3xl font-bold text-gray-900">{computedData.totalEvents}</p>
              <p className="text-sm text-gray-500 mt-1">Active events</p>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-600">Total Billing</h3>
                <span className="text-2xl">💰</span>
              </div>
              <p className="text-3xl font-bold text-gray-900">R {computedData.totalBilling.toFixed(2)}</p>
              <p className="text-sm text-gray-500 mt-1">Invoiced amount</p>
            </div>
          </div>

          {/* Top Events & Monthly Trend */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Events by Hours</h3>
              <div className="space-y-3">
                {computedData.topEvents.length === 0 ? (
                  <p className="text-gray-500 text-sm">No data available</p>
                ) : (
                  computedData.topEvents.map((event: any, index: number) => (
                    <div key={event.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center font-bold text-sm">
                          {index + 1}
                        </span>
                        <span className="font-medium text-gray-900">{event.name}</span>
                      </div>
                      <span className="font-bold text-gray-900">{event.hours.toFixed(1)}h</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Trend</h3>
              <div className="space-y-3">
                {computedData.monthlyTrend.length === 0 ? (
                  <p className="text-gray-500 text-sm">No data available</p>
                ) : (
                  computedData.monthlyTrend.map((month: any) => (
                    <div key={month.month} className="flex items-center justify-between">
                      <span className="font-medium text-gray-900">
                        {new Date(month.month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                      </span>
                      <div className="flex items-center gap-3">
                        <div className="w-32 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-[#a4c71d] h-2 rounded-full"
                            style={{ width: `${Math.min((month.hours / Math.max(...computedData.monthlyTrend.map((m: any) => m.hours), 1)) * 100, 100)}%` }}
                          ></div>
                        </div>
                        <span className="font-bold text-gray-900 w-16 text-right">{month.hours.toFixed(1)}h</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
