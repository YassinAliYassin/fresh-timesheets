import { useState } from 'react';
import api from './api';
import { Mail, CheckCircle, AlertCircle } from 'lucide-react';

interface NotificationSettings {
  email: string;
  notifyOnSubmit: boolean;
  notifyOnApprove: boolean;
  notifyOnReject: boolean;
  dailySummary: boolean;
}

export default function EmailNotifications() {
  const [settings, setSettings] = useState<NotificationSettings>({
    email: '',
    notifyOnSubmit: true,
    notifyOnApprove: true,
    notifyOnReject: true,
    dailySummary: false
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const saveSettings = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await api.post('/api/notifications/settings', settings);
      setMessage({ type: 'success', text: 'Notification settings saved successfully!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error: any) {
      // If endpoint doesn't exist yet, show a graceful message
      if (error.message?.includes('404') || error.message?.includes('Not Found')) {
        setMessage({ type: 'error', text: 'Notification service is not yet configured on the server.' });
      } else {
        setMessage({ type: 'error', text: error.message || 'Failed to save settings' });
      }
    } finally {
      setSaving(false);
    }
  };

  const sendTestEmail = async () => {
    if (!settings.email) {
      setMessage({ type: 'error', text: 'Please enter an email address first.' });
      return;
    }
    try {
      await api.post('/api/notifications/test', { email: settings.email });
      setMessage({ type: 'success', text: 'Test email sent successfully!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error: any) {
      if (error.message?.includes('404') || error.message?.includes('Not Found')) {
        setMessage({ type: 'error', text: 'Email service is not yet configured on the server.' });
      } else {
        setMessage({ type: 'error', text: 'Failed to send test email' });
      }
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Email Notifications</h2>
        <p className="text-gray-600">Configure when you receive email alerts</p>
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
          message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        }`}>
          {message.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
          {message.text}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm p-6 space-y-6">
        {/* Email Address */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Email Address
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="email"
              value={settings.email}
              onChange={(e) => setSettings({ ...settings, email: e.target.value })}
              placeholder="you@company.com"
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#a4c71d]"
            />
          </div>
        </div>

        {/* Notification Toggles */}
        <div className="space-y-4">
          <h3 className="font-semibold text-gray-900">Notify me when:</h3>

          {[
            { key: 'notifyOnSubmit', label: 'Timesheet submitted', desc: 'When staff submit new timesheets' },
            { key: 'notifyOnApprove', label: 'Timesheet approved', desc: 'When a timesheet is approved' },
            { key: 'notifyOnReject', label: 'Timesheet rejected', desc: 'When a timesheet is rejected with feedback' },
            { key: 'dailySummary', label: 'Daily summary', desc: 'Receive a daily digest of all activity' }
          ].map(({ key, label, desc }) => (
            <div key={key} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
              <div>
                <p className="font-medium text-gray-900">{label}</p>
                <p className="text-sm text-gray-500">{desc}</p>
              </div>
              <button
                onClick={() => setSettings({ ...settings, [key]: !settings[key as keyof NotificationSettings] })}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  settings[key as keyof NotificationSettings] ? 'bg-[#a4c71d]' : 'bg-gray-300'
                }`}
              >
                <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  settings[key as keyof NotificationSettings] ? 'translate-x-6' : ''
                }`} />
              </button>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          <button
            onClick={saveSettings}
            disabled={saving}
            className="flex-1 bg-[#a4c71d] text-white py-2.5 rounded-lg hover:bg-[#8fb018] transition-colors disabled:opacity-50 font-semibold"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
          <button
            onClick={sendTestEmail}
            className="px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Send Test Email
          </button>
        </div>
      </div>
    </div>
  );
}
