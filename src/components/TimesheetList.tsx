import { useState, useEffect } from 'react';
import api from './api';
import { Search, User, Calendar } from 'lucide-react';

export default function TimesheetList() {
  const [timesheets, setTimesheets] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStaff, setFilterStaff] = useState('');
  const [filterEvent, setFilterEvent] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [staffList, setStaffList] = useState<any[]>([]);
  const [eventList, setEventList] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    filterTimesheets();
  }, [timesheets, search, filterStaff, filterEvent, filterMonth]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [timesheetsRes] = await Promise.all([
        api.get('/api/timesheets'),
        api.get('/api/events')
      ]);
      
      const timesheetData = timesheetsRes.data || [];
      setTimesheets(timesheetData);
      
      // Extract unique staff and events for filters
      const staffs: any[] = [...new Set(timesheetData.map((t: any) => t.staff_name))];
      const events: any[] = [...new Set(timesheetData.map((t: any) => t.event_name))];
      setStaffList(staffs);
      setEventList(events);
    } catch (error) {
      console.error('Failed to fetch:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterTimesheets = () => {
    let result = [...timesheets];

    // Search by staff name or event name
    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter(t => 
        t.staff_name?.toLowerCase().includes(searchLower) ||
        t.event_name?.toLowerCase().includes(searchLower)
      );
    }

    // Filter by staff
    if (filterStaff) {
      result = result.filter(t => t.staff_name === filterStaff);
    }

    // Filter by event
    if (filterEvent) {
      result = result.filter(t => t.event_name === filterEvent);
    }

    // Filter by month
    if (filterMonth) {
      result = result.filter(t => t.date?.startsWith(filterMonth));
    }

    setFiltered(result);
  };

  const clearFilters = () => {
    setSearch('');
    setFilterStaff('');
    setFilterEvent('');
    setFilterMonth('');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Timesheet Records</h1>
        <p className="text-gray-600">Search and filter all timesheet entries</p>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6 space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search by staff name or event..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <select
            value={filterStaff}
            onChange={(e) => setFilterStaff(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Staff</option>
            {staffList.map(staff => (
              <option key={staff} value={staff}>{staff}</option>
            ))}
          </select>

          <select
            value={filterEvent}
            onChange={(e) => setFilterEvent(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Events</option>
            {eventList.map(event => (
              <option key={event} value={event}>{event}</option>
            ))}
          </select>

          <input
            type="month"
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <button
            onClick={clearFilters}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Clear Filters
          </button>
        </div>

        {/* Results Count */}
        <div className="text-sm text-gray-500">
          Showing {filtered.length} of {timesheets.length} entries
        </div>
      </div>

      {/* Timesheet List */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {filtered.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {filtered.map((sheet, index) => (
              <div key={sheet.id || index} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <User size={18} className="text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{sheet.staff_name}</p>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Calendar size={14} />
                        {sheet.date}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900">{sheet.hours} hours</p>
                    <p className="text-sm text-gray-500">{sheet.event_name}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-gray-500">
            No timesheets found matching your filters.
          </div>
        )}
      </div>
    </div>
  );
}
