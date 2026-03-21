import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { BookOpen, Plus, Trash2, FileText, Upload } from 'lucide-react';
import type { KnowledgeDocument } from '../types';
import { getKnowledge, uploadKnowledge, deleteKnowledge } from '../api';
import { Modal } from '../components/Modal';
import { EmptyState } from '../components/EmptyState';

interface OutletCtx {
  addToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

const DOC_TYPES = ['reference', 'book', 'guide', 'protocol', 'research'];

export function KnowledgePage() {
  const { addToast } = useOutletContext<OutletCtx>();
  const [docs, setDocs] = useState<KnowledgeDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ title: '', doc_type: 'reference', category: '', content: '', filename: '' });

  const load = async () => {
    setLoading(true);
    try { setDocs(await getKnowledge()); }
    catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleFileRead = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      setForm({ ...form, content: text, filename: file.name, title: form.title || file.name.replace(/\.[^.]+$/, '') });
    };
    if (file.type === 'application/pdf') {
      // For PDF, read as base64
      reader.readAsDataURL(file);
    } else {
      reader.readAsText(file);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await uploadKnowledge(form);
      addToast('Document uploaded');
      setModalOpen(false);
      setForm({ title: '', doc_type: 'reference', category: '', content: '', filename: '' });
      load();
    } catch (err) { addToast(String(err), 'error'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this document?')) return;
    try { await deleteKnowledge(id); addToast('Document deleted'); load(); }
    catch (err) { addToast(String(err), 'error'); }
  };

  const inputCls = 'w-full bg-dark-700 border border-dark-500 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-emerald-500';

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Knowledge Base</h1>
          <p className="text-sm text-gray-500 mt-1">Upload functional medicine references for the AI assistant.</p>
        </div>
        <button onClick={() => setModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500 text-white rounded-lg text-sm font-medium hover:bg-emerald-600">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Upload</span>
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : docs.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No documents yet"
          description="Upload functional medicine books, protocols, or research papers. The AI assistant will use these as reference."
          action={{ label: 'Upload Document', onClick: () => setModalOpen(true) }}
        />
      ) : (
        <div className="space-y-2">
          {docs.map((doc) => (
            <div key={doc.id} className="bg-dark-800 border border-dark-600 rounded-xl p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <FileText className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <div className="font-medium text-sm">{doc.title}</div>
                    <div className="text-xs text-gray-500 flex items-center gap-2 mt-0.5">
                      <span className="capitalize">{doc.doc_type}</span>
                      {doc.category && <span>{doc.category}</span>}
                      {doc.filename && <span className="truncate">{doc.filename}</span>}
                    </div>
                    {doc.content_preview && (
                      <p className="text-xs text-gray-600 mt-1 line-clamp-2">{doc.content_preview}</p>
                    )}
                  </div>
                </div>
                <button onClick={() => handleDelete(doc.id)} className="p-1.5 text-gray-500 hover:text-red-400 shrink-0">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Upload Document" wide>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Title *</label>
            <input className={inputCls} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Type</label>
              <select className={inputCls} value={form.doc_type} onChange={(e) => setForm({ ...form, doc_type: e.target.value })}>
                {DOC_TYPES.map((t) => <option key={t} value={t} className="capitalize">{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Category</label>
              <input className={inputCls} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Thyroid, Gut, etc." />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-2">Upload File</label>
            <label className="flex items-center gap-2 px-4 py-3 bg-dark-700 border border-dashed border-dark-500 rounded-lg cursor-pointer hover:border-emerald-500/50">
              <Upload className="w-5 h-5 text-gray-500" />
              <span className="text-sm text-gray-400">{form.filename || 'Choose a file (.txt, .md, .pdf)'}</span>
              <input type="file" accept=".txt,.md,.pdf,.csv" onChange={handleFileRead} className="hidden" />
            </label>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Or paste content directly</label>
            <textarea className={inputCls} rows={6} value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              placeholder="Paste text content here..." />
          </div>
          <button type="submit" disabled={!form.title || !form.content}
            className="w-full bg-emerald-500 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-emerald-600 disabled:opacity-50">
            Upload
          </button>
        </form>
      </Modal>
    </div>
  );
}
