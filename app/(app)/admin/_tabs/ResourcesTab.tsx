"use client";

import { useState, useEffect } from "react";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Resource, ResourceCategory } from "@/lib/types";
import { Loader2, Plus, Edit2, Trash2, X, ChevronDown } from "lucide-react";

const CATEGORIES: ResourceCategory[] = ["getting-started", "prompt-engineering", "workshops", "reference", "external", "faculty"];
const TYPES: Resource["type"][] = ["drive", "link", "video"];
const AUDIENCES: Resource["audience"][] = ["student", "faculty", "all"];
const TECH_LEVELS: Array<NonNullable<Resource["techLevels"][number]>> = ["beginner", "some", "intermediate", "advanced"];

function ResourceForm({
  resource,
  onSave,
  onCancel,
}: {
  resource?: Resource;
  onSave: (r: Omit<Resource, "id">) => Promise<void>;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState<Omit<Resource, "id">>(
    resource || {
      title: "",
      description: "",
      type: "link",
      href: "",
      category: "getting-started",
      audience: "all",
      techLevels: [],
      tags: [],
      featured: false,
      order: 0,
      published: false,
    }
  );
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(formData);
      onCancel();
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <input
          type="text"
          placeholder="Title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          className="col-span-2 px-3 py-2 border border-[#e8e6dc] rounded-lg text-sm"
          required
        />
        <textarea
          placeholder="Description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="col-span-2 px-3 py-2 border border-[#e8e6dc] rounded-lg text-sm"
          rows={3}
          required
        />
        <input
          type="url"
          placeholder="URL"
          value={formData.href}
          onChange={(e) => setFormData({ ...formData, href: e.target.value })}
          className="col-span-2 px-3 py-2 border border-[#e8e6dc] rounded-lg text-sm"
          required
        />
        <select
          value={formData.category}
          onChange={(e) => setFormData({ ...formData, category: e.target.value as ResourceCategory })}
          className="px-3 py-2 border border-[#e8e6dc] rounded-lg text-sm"
        >
          {CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
        <select
          value={formData.type}
          onChange={(e) => setFormData({ ...formData, type: e.target.value as Resource["type"] })}
          className="px-3 py-2 border border-[#e8e6dc] rounded-lg text-sm"
        >
          {TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <select
          value={formData.audience}
          onChange={(e) => setFormData({ ...formData, audience: e.target.value as Resource["audience"] })}
          className="px-3 py-2 border border-[#e8e6dc] rounded-lg text-sm"
        >
          {AUDIENCES.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
        <input
          type="number"
          placeholder="Order"
          value={formData.order}
          onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
          className="px-3 py-2 border border-[#e8e6dc] rounded-lg text-sm"
        />
        <input
          type="text"
          placeholder="Tags (comma-separated)"
          value={formData.tags.join(", ")}
          onChange={(e) => setFormData({ ...formData, tags: e.target.value.split(",").map((t) => t.trim()) })}
          className="col-span-2 px-3 py-2 border border-[#e8e6dc] rounded-lg text-sm"
        />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={formData.featured}
            onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
          />
          Featured
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={formData.published}
            onChange={(e) => setFormData({ ...formData, published: e.target.checked })}
          />
          Published
        </label>
        <div className="col-span-2">
          <label className="text-sm font-medium text-[#555555] mb-2 block">Tech Levels:</label>
          <div className="flex flex-wrap gap-2">
            {TECH_LEVELS.map((level) => (
              <label key={level} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={formData.techLevels.includes(level)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setFormData({ ...formData, techLevels: [...formData.techLevels, level] });
                    } else {
                      setFormData({
                        ...formData,
                        techLevels: formData.techLevels.filter((t) => t !== level),
                      });
                    }
                  }}
                />
                {level}
              </label>
            ))}
          </div>
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm border border-[#e8e6dc] rounded-lg text-[#555555] hover:bg-[#faf9f5]"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 text-sm bg-[#d97757] text-white rounded-lg hover:bg-[#c86843] disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </div>
    </form>
  );
}

export default function ResourcesTab() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDocs(query(collection(db, "resources"), orderBy("order")));
        setResources(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Resource)));
      } catch (err) {
        console.error("Error loading resources:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSave = async (resourceData: Omit<Resource, "id">) => {
    try {
      if (editingId) {
        await updateDoc(doc(db, "resources", editingId), resourceData);
        setResources((prev) =>
          prev.map((r) => (r.id === editingId ? { id: editingId, ...resourceData } : r))
        );
        setEditingId(null);
      } else {
        const docRef = await addDoc(collection(db, "resources"), resourceData);
        setResources((prev) => [...prev, { id: docRef.id, ...resourceData }]);
        setIsCreating(false);
      }
    } catch (err) {
      console.error("Error saving resource:", err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this resource?")) return;
    try {
      await deleteDoc(doc(db, "resources", id));
      setResources((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      console.error("Error deleting resource:", err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={28} className="animate-spin text-[#d97757]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[#141413]">Resources ({resources.length})</h2>
        <button
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#d97757] text-white text-sm font-medium rounded-lg hover:bg-[#c86843]"
        >
          <Plus size={16} />
          New Resource
        </button>
      </div>

      {/* Create Modal */}
      {isCreating && (
        <div className="bg-white rounded-2xl border border-[#e8e6dc] p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-[#141413]">Create Resource</h3>
            <button onClick={() => setIsCreating(false)} className="text-[#b0aea5]">
              <X size={18} />
            </button>
          </div>
          <ResourceForm onSave={handleSave} onCancel={() => setIsCreating(false)} />
        </div>
      )}

      {/* Resources Table */}
      <div className="bg-white rounded-2xl border border-[#e8e6dc] overflow-hidden">
        {resources.length === 0 ? (
          <div className="p-8 text-center text-[#b0aea5]">No resources yet. Create one to get started.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#faf9f5] border-b border-[#e8e6dc]">
                <tr>
                  <th className="px-6 py-3 text-left font-semibold text-[#555555]">Title</th>
                  <th className="px-6 py-3 text-left font-semibold text-[#555555]">Category</th>
                  <th className="px-6 py-3 text-left font-semibold text-[#555555]">Type</th>
                  <th className="px-6 py-3 text-left font-semibold text-[#555555]">Published</th>
                  <th className="px-6 py-3 text-right font-semibold text-[#555555]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e8e6dc]">
                {resources.map((resource) => (
                  <tr key={resource.id} className="hover:bg-[#faf9f5] transition-colors">
                    <td className="px-6 py-4 text-[#141413] font-medium">{resource.title}</td>
                    <td className="px-6 py-4 text-[#b0aea5]">{resource.category}</td>
                    <td className="px-6 py-4 text-[#b0aea5]">{resource.type}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                          resource.published
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {resource.published ? "Yes" : "No"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                      <button
                        onClick={() => setEditingId(resource.id)}
                        className="p-2 text-[#d97757] hover:bg-[#faf9f5] rounded"
                        title="Edit"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(resource.id)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingId && (
        <div className="bg-white rounded-2xl border border-[#e8e6dc] p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-[#141413]">Edit Resource</h3>
            <button onClick={() => setEditingId(null)} className="text-[#b0aea5]">
              <X size={18} />
            </button>
          </div>
          <ResourceForm
            resource={resources.find((r) => r.id === editingId)}
            onSave={handleSave}
            onCancel={() => setEditingId(null)}
          />
        </div>
      )}
    </div>
  );
}
