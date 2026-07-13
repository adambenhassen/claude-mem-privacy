import { useState, useEffect } from 'react';
import { Settings } from '../types';
import { DEFAULT_SETTINGS } from '../constants/settings';
import { API_ENDPOINTS } from '../constants/api';
import { TIMING } from '../constants/timing';
import { authFetch } from '../utils/api';

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');

  useEffect(() => {
    authFetch(API_ENDPOINTS.SETTINGS)
      .then(async res => {
        if (!res.ok) {
          throw new Error(`Failed to load settings (${res.status})`);
        }
        return res.json();
      })
      .then(data => {
        // Spread the server response over the defaults instead of hand-picking
        // keys — a key missing from this list silently never reached the UI
        // (CLAUDE_MEM_PROVIDER_PROJECT_OVERRIDES appeared to "not persist").
        setSettings({ ...DEFAULT_SETTINGS, ...data });
      })
      .catch(error => {
        console.error('Failed to load settings:', error);
      });
  }, []);

  const saveSettings = async (newSettings: Settings) => {
    setIsSaving(true);
    setSaveStatus('Saving...');

    try {
      // Only send keys that changed: the loaded settings can contain values
      // (hand-edited in settings.json) that fail server validation — posting
      // them back untouched would block saving unrelated settings.
      const changed: Record<string, string> = {};
      for (const [key, value] of Object.entries(newSettings)) {
        if (value !== (settings as unknown as Record<string, unknown>)[key]) changed[key] = value as string;
      }
      const response = await authFetch(API_ENDPOINTS.SETTINGS, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(changed)
      });

      if (!response.ok) {
        setSaveStatus(`✗ Error: ${response.status === 401 ? 'Unauthorized' : response.statusText}`);
        setIsSaving(false);
        return;
      }

      const result = await response.json();

      if (result.success) {
        setSettings(newSettings);
        setSaveStatus('✓ Saved');
        setTimeout(() => setSaveStatus(''), TIMING.SAVE_STATUS_DISPLAY_DURATION_MS);
      } else {
        setSaveStatus(`✗ Error: ${result.error}`);
      }
    } catch (error) {
      setSaveStatus(`✗ Error: ${error instanceof Error ? error.message : 'Network error'}`);
    }

    setIsSaving(false);
  };

  return { settings, saveSettings, isSaving, saveStatus };
}
