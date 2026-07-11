import { useState, useEffect, useCallback } from 'react';
import api from './api';
import type { TimesheetRecord } from '../types';
import { ChevronLeft, ChevronRight, Clock } from 'lucide-react';

export default function CalendarView() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [timesheets, setTimesheets] = useState<TimesheetRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<number | null>(null);
  const [dayEntries, setDayEntries] = useState<TimesheetRecord[]>([]);

  const fetchTimesheets = useCallback(async () => {
    setLoading(true);
    try {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      const data = await api.get<TimesheetRecord[]>(`/api/timesheets?month=${month}&year=${year}`);
      setTimesheets(data || []);
    } catch (error) {
      console.error('Failed to fetch timesheets:', error);
    } finally {
      setLoading(false);
    }
  }, [currentDate]);

  useEffect(() => {
    fetchTimesheets();
  }, [fetchTimesheets]);

  const getDaysInMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    return new Date(year, month, 1).getDay();
  };

  const formatDateStr = (day: number) => {
    const year = currentDate.getFullYear();
    const month = (currentDate.getMonth() + 1).toString().padStart(2, '0');
    const dayStr = day.toString().padStart(2, '0');
    return `${year}-${month}-${dayStr}`;
  };

  const hasEntry = (day: number) => {
    const dateStr = formatDateStr(day);
    return timesheets.some(t => t.clock_in && t.clock_in.startsWith(dateStr));
  };

  const getDayEntries = (day: number) => {
    const dateStr = formatDateStr(day);
    return timesheets.filter(t => t.clock_in && t.clock_in.startsWith(dateStr));
  };

  const handleDayClick = (day: number) => {
    const entries = getDayEntries(day);
    setSelectedDate(day);
    setDayEntries(entries);
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    setSelectedDate(null);
    setDayEntries([]);
  };

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    setSelectedDate(null);
    setDayEntries([]);
  };

  const daysInMonth = getDaysInMonth();
  const firstDay = getFirstDayOfMonth();
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Calendar View</h1>
        <p className="text-gray-600">Visualize your timesheet entries by date</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm p-6">
          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={prevMonth}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            <h2 className="text-xl font-semibold text-gray-900">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h2>
            <button
              onClick={nextMonth}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronRight size={20} />
            </button>
          </div>

          {/* Day Names */}
          <div className="grid grid-cols-7 gap-2 mb-2">
            {dayNames.map(day => (
              <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-2">
            {[...Array(firstDay)].map((_, i) => (
              <div key={`empty-${i}`} className="h-20 rounded-lg" />
            ))}

            {[...Array(daysInMonth)].map((_, i) => {
              const day = i + 1;
              const hasEntries = hasEntry(day);
              const isSelected = selectedDate === day;
              const isToday = new Date().getDate() === day &&
                            new Date().getMonth() === currentDate.getMonth() &&
                            new Date().getFullYear() === currentDate.getFullYear();

              return (
                <button
                  key={day}
                  onClick={() => handleDayClick(day)}
                  className={`h-20 rounded-lg border transition-all ${
                    isSelected
                      ? 'border-[#a4c71d] bg-[#a4c71d]/10'
                      : hasEntries
                      ? 'border-blue-300 bg-blue-50 hover:bg-blue-100'
                      : 'border-gray-200 hover:bg-gray-50'
                  } ${isToday ? 'ring-2 ring-[#a4c71d]' : ''}`}
                >
                  <div className="p-1">
                    <div className={`text-sm font-medium mb-1 ${
                      isToday ? 'text-[#a4c71d] font-bold' : 'text-gray-700'
                    }`}>
                      {day}
                    </div>
                    {hasEntries && (
                      <div className="flex items-center gap-1">
                        <Clock size={10} className="text-blue-600" />
                        <span className="text-xs text-blue-600">Entry</span>
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Day Details Sidebar */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {selectedDate
              ? `${selectedDate} ${monthNames[currentDate.getMonth()]} Details`
              : 'Select a Date'
            }
          </h3>

          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#a4c71d]"></div>
            </div>
          ) : selectedDate ? (
            dayEntries.length > 0 ? (
              <div className="space-y-3">
                {dayEntries.map((entry, i) => (
                  <div key={i} className="p-3 bg-gray-50 rounded-lg">
                    <p className="font-medium text-gray-900">{entry.staff_name}</p>
                    <p className="text-sm text-gray-600">{entry.event_name}</p>
                    <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
                      <Clock size={12} />
                      {entry.total_hours ? `${entry.total_hours.toFixed(1)} hours` : 'In progress'}
                    </div>
                  </div>
                ))}
                <div className="pt-3 border-t">
                  <p className="text-sm font-medium text-gray-900">
                    Total: {dayEntries.reduce((sum, e) => sum + (e.total_hours || 0), 0).toFixed(1)} hours
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No entries for this date.</p>
            )
          ) : (
            <p className="text-gray-500 text-sm">Click on a date to view timesheet entries.</p>
          )}
        </div>
      </div>
    </div>
  );
}
