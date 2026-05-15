'use client';

import { useEffect, useState } from 'react';
import { Loader2, Pencil, Plus, Save, Trash2, X } from 'lucide-react';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import { useTheme } from '@/contexts/ThemeContext';
import homepageService, { HomepageSection, HomepageSectionType } from '@/services/homepageService';

const sectionTypes: { value: HomepageSectionType; label: string }[] = [
  { value: 'hero_banner', label: 'Hero Banner' },
  { value: 'collection_tiles', label: 'Collection Tiles' },
  { value: 'bannered_collections', label: 'Bannered Collections' },
  { value: 'new_arrivals', label: 'New Arrivals' },
  { value: 'category_tabs', label: 'Category Tabs' },
  { value: 'instagram_reels', label: 'Instagram Reels' },
];

const defaultSettings = (type: HomepageSectionType) => {
  if (type === 'new_arrivals') return '{\n  "limit": 40\n}';
  if (type === 'category_tabs') return '{\n  "parentQueries": ["sneakers"],\n  "productsPerTab": 8\n}';
  if (type === 'collection_tiles' || type === 'bannered_collections') {
    return '{\n  "items": [\n    {\n      "id": 1,\n      "title": "Collection title",\n      "subtitle": "Short subtitle",\n      "image": "https://example.com/banner.jpg",\n      "href": "/e-commerce/collections/collection-slug",\n      "show_text": true\n    }\n  ]\n}';
  }
  return '{}';
};

const settingsToText = (value: any, type: HomepageSectionType) => {
  if (!value || (typeof value === 'object' && Object.keys(value).length === 0)) return defaultSettings(type);
  if (typeof value === 'string') return value;
  return JSON.stringify(value, null, 2);
};

export default function HomepageSettingsPage() {
  const { darkMode, setDarkMode } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sections, setSections] = useState<HomepageSection[]>([]);
  const [editing, setEditing] = useState<HomepageSection | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [type, setType] = useState<HomepageSectionType>('hero_banner');
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [buttonText, setButtonText] = useState('');
  const [sortOrder, setSortOrder] = useState('0');
  const [isActive, setIsActive] = useState(true);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState('');
  const [settingsText, setSettingsText] = useState(defaultSettings('hero_banner'));
  const [removeImage, setRemoveImage] = useState(false);

  const resetForm = () => {
    setEditing(null);
    setType('hero_banner');
    setTitle('');
    setSubtitle('');
    setLinkUrl('');
    setButtonText('');
    setSortOrder('0');
    setIsActive(true);
    setImageFile(null);
    setImageUrl('');
    setSettingsText(defaultSettings('hero_banner'));
    setRemoveImage(false);
  };

  const loadSections = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await homepageService.getAll();
      setSections(data);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to load homepage sections.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSections();
  }, []);

  const startEdit = (section: HomepageSection) => {
    setEditing(section);
    setType(section.type);
    setTitle(section.title || '');
    setSubtitle(section.subtitle || '');
    setLinkUrl(section.link_url || '');
    setButtonText(section.button_text || '');
    setSortOrder(String(section.sort_order ?? 0));
    setIsActive(Boolean(section.is_active));
    setImageFile(null);
    setImageUrl(section.image_url || '');
    setSettingsText(settingsToText(section.settings, section.type));
    setRemoveImage(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const onTypeChange = (nextType: HomepageSectionType) => {
    setType(nextType);
    if (!editing) setSettingsText(defaultSettings(nextType));
  };

  const submit = async () => {
    setError(null);
    setSuccess(null);

    let parsedSettings: any = {};
    try {
      parsedSettings = settingsText.trim() ? JSON.parse(settingsText) : {};
    } catch (_err) {
      setError('Settings must be valid JSON.');
      return;
    }

    const formData = new FormData();
    formData.append('type', type);
    formData.append('title', title);
    formData.append('subtitle', subtitle);
    formData.append('link_url', linkUrl);
    formData.append('button_text', buttonText);
    formData.append('sort_order', String(Number(sortOrder) || 0));
    formData.append('is_active', isActive ? '1' : '0');
    formData.append('settings', JSON.stringify(parsedSettings));
    if (imageFile) formData.append('image', imageFile);
    else if (imageUrl && imageUrl !== editing?.image_url) formData.append('image', imageUrl);
    if (removeImage) formData.append('remove_image', '1');

    try {
      setSaving(true);
      if (editing) await homepageService.update(editing.id, formData);
      else await homepageService.create(formData);
      setSuccess(editing ? 'Homepage section updated.' : 'Homepage section created.');
      resetForm();
      await loadSections();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to save homepage section.');
    } finally {
      setSaving(false);
    }
  };

  const removeSection = async (section: HomepageSection) => {
    if (!confirm(`Delete ${section.title || section.type}?`)) return;
    try {
      setError(null);
      await homepageService.delete(section.id);
      setSuccess('Homepage section deleted.');
      await loadSections();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to delete homepage section.');
    }
  };

  return (
    <div className={darkMode ? 'dark' : ''}>
      <div className="flex h-screen bg-gray-50 dark:bg-gray-950">
        <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header darkMode={darkMode} setDarkMode={setDarkMode} toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
          <main className="flex-1 overflow-auto p-6">
            <div className="max-w-6xl space-y-6">
              <div>
                <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Homepage Builder</h1>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  Build the public e-commerce homepage from ordered visual sections.
                </p>
              </div>

              {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">{error}</div>}
              {success && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200">{success}</div>}

              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {editing ? 'Edit Section' : 'Add Section'}
                  </h2>
                  {editing && (
                    <button onClick={resetForm} className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800">
                      <X className="h-4 w-4" /> Cancel edit
                    </button>
                  )}
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <label className="space-y-1">
                    <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">Section Type</span>
                    <select value={type} onChange={(e) => onTypeChange(e.target.value as HomepageSectionType)} className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950 dark:text-white">
                      {sectionTypes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                    </select>
                  </label>
                  <label className="space-y-1">
                    <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">Sort Order</span>
                    <input value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} type="number" className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950 dark:text-white" />
                  </label>
                  <label className="space-y-1">
                    <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">Title</span>
                    <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950 dark:text-white" />
                  </label>
                  <label className="space-y-1">
                    <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">Subtitle</span>
                    <input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950 dark:text-white" />
                  </label>
                  <label className="space-y-1">
                    <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">Link URL</span>
                    <input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="/e-commerce/products" className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950 dark:text-white" />
                  </label>
                  <label className="space-y-1">
                    <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">Button Text</span>
                    <input value={buttonText} onChange={(e) => setButtonText(e.target.value)} placeholder="Shop Now" className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950 dark:text-white" />
                  </label>
                  <label className="space-y-1">
                    <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">Upload Image</span>
                    <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] || null)} className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950 dark:text-white" />
                  </label>
                  <label className="space-y-1">
                    <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">Image URL</span>
                    <input value={imageUrl} onChange={(e) => { setImageUrl(e.target.value); setRemoveImage(false); }} placeholder="https://..." className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950 dark:text-white" />
                  </label>
                </div>

                {imageUrl && !imageFile && !removeImage && <img src={imageUrl} alt="Preview" className="mt-4 h-40 w-full rounded-xl object-cover border border-gray-200 dark:border-gray-800" />}
                {editing?.image_url && !imageFile && (
                  <label className="mt-3 flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <input type="checkbox" checked={removeImage} onChange={(e) => setRemoveImage(e.target.checked)} /> Remove current image
                  </label>
                )}

                <label className="mt-4 block space-y-1">
                  <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">Settings JSON</span>
                  <textarea value={settingsText} onChange={(e) => setSettingsText(e.target.value)} rows={8} className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 font-mono text-xs dark:border-gray-700 dark:bg-gray-950 dark:text-white" />
                </label>

                <label className="mt-3 flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} /> Active on public homepage
                </label>

                <button onClick={submit} disabled={saving} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-50 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editing ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                  {editing ? 'Update Section' : 'Create Section'}
                </button>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Sections</h2>
                {loading ? <div className="mt-4 flex items-center gap-2 text-sm text-gray-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading...</div> : null}
                {!loading && sections.length === 0 ? <p className="mt-4 text-sm text-gray-500">No homepage sections yet. The public homepage will use the existing default layout.</p> : null}
                <div className="mt-4 space-y-3">
                  {sections.map((section) => (
                    <div key={section.id} className="flex flex-col gap-3 rounded-xl border border-gray-200 p-3 dark:border-gray-800 md:flex-row md:items-center md:justify-between">
                      <div className="flex items-center gap-3">
                        {section.image_url ? <img src={section.image_url} alt={section.title || section.type} className="h-16 w-24 rounded-lg object-cover" /> : <div className="h-16 w-24 rounded-lg bg-gray-100 dark:bg-gray-800" />}
                        <div>
                          <div className="font-semibold text-gray-900 dark:text-white">{section.title || section.type}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{section.type} • order {section.sort_order} • {section.is_active ? 'active' : 'inactive'}</div>
                          {section.subtitle ? <div className="text-sm text-gray-600 dark:text-gray-300 line-clamp-1">{section.subtitle}</div> : null}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => startEdit(section)} className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-sm hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"><Pencil className="h-4 w-4" /> Edit</button>
                        <button onClick={() => removeSection(section)} className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/30"><Trash2 className="h-4 w-4" /> Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
