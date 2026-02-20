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
import type { CaseStudy } from "@/lib/types";
import { Loader2, Plus, Edit2, Trash2 } from "lucide-react";
import Modal from "@/components/Modal";

function CaseStudyForm({
  study,
  onSave,
  onCancel,
}: {
  study?: CaseStudy;
  onSave: (s: Omit<CaseStudy, "id">) => Promise<void>;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState<Omit<CaseStudy, "id">>(
    study || {
      type: "academic",
      title: "",
      semester: "",
      description: "",
      outcomes: [],
      tools: [],
      featured: false,
      order: 0,
      published: false,
      course: "",
      courseTitle: "",
      professor: "",
      department: "",
      orgName: "",
      orgType: "",
      image: "",
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
        <div className="col-span-2">
          <label className="block text-sm font-medium text-[#141413] mb-1.5">Type</label>
          <select
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value as "academic" | "club" })}
            className="w-full px-3 py-2 border border-[#e8e6dc] rounded-lg text-sm focus:outline-none focus:border-[#d97757]"
          >
            <option value="academic">Academic</option>
            <option value="club">Club</option>
          </select>
        </div>

        <div className="col-span-2">
          <label className="block text-sm font-medium text-[#141413] mb-1.5">Title</label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full px-3 py-2 border border-[#e8e6dc] rounded-lg text-sm focus:outline-none focus:border-[#d97757]"
            required
          />
        </div>

        <div className="col-span-2">
          <label className="block text-sm font-medium text-[#141413] mb-1.5">Semester</label>
          <input
            type="text"
            placeholder="e.g., Spring 2024"
            value={formData.semester}
            onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
            className="w-full px-3 py-2 border border-[#e8e6dc] rounded-lg text-sm focus:outline-none focus:border-[#d97757]"
            required
          />
        </div>

        <div className="col-span-2">
          <label className="block text-sm font-medium text-[#141413] mb-1.5">Description</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-3 py-2 border border-[#e8e6dc] rounded-lg text-sm focus:outline-none focus:border-[#d97757]"
            rows={3}
            required
          />
        </div>

        <div className="col-span-2">
          <label className="block text-sm font-medium text-[#141413] mb-1.5">
            Outcomes <span className="text-[#b0aea5] font-normal">(one per line)</span>
          </label>
          <textarea
            value={formData.outcomes.join("\n")}
            onChange={(e) => setFormData({ ...formData, outcomes: e.target.value.split("\n").filter(Boolean) })}
            className="w-full px-3 py-2 border border-[#e8e6dc] rounded-lg text-sm focus:outline-none focus:border-[#d97757]"
            rows={3}
          />
        </div>

        <div className="col-span-2">
          <label className="block text-sm font-medium text-[#141413] mb-1.5">
            Tools <span className="text-[#b0aea5] font-normal">(comma-separated)</span>
          </label>
          <input
            type="text"
            value={formData.tools.join(", ")}
            onChange={(e) => setFormData({ ...formData, tools: e.target.value.split(",").map((t) => t.trim()) })}
            className="w-full px-3 py-2 border border-[#e8e6dc] rounded-lg text-sm focus:outline-none focus:border-[#d97757]"
          />
        </div>

        <div className="col-span-2">
          <label className="block text-sm font-medium text-[#141413] mb-1.5">
            Image URL <span className="text-[#b0aea5] font-normal">(optional)</span>
          </label>
          <input
            type="url"
            value={formData.image || ""}
            onChange={(e) => setFormData({ ...formData, image: e.target.value })}
            className="w-full px-3 py-2 border border-[#e8e6dc] rounded-lg text-sm focus:outline-none focus:border-[#d97757]"
          />
        </div>

        {formData.type === "academic" ? (
          <>
            <div>
              <label className="block text-sm font-medium text-[#141413] mb-1.5">Course Code</label>
              <input
                type="text"
                placeholder="e.g., CS 101"
                value={formData.course || ""}
                onChange={(e) => setFormData({ ...formData, course: e.target.value })}
                className="w-full px-3 py-2 border border-[#e8e6dc] rounded-lg text-sm focus:outline-none focus:border-[#d97757]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#141413] mb-1.5">Course Title</label>
              <input
                type="text"
                value={formData.courseTitle || ""}
                onChange={(e) => setFormData({ ...formData, courseTitle: e.target.value })}
                className="w-full px-3 py-2 border border-[#e8e6dc] rounded-lg text-sm focus:outline-none focus:border-[#d97757]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#141413] mb-1.5">Professor</label>
              <input
                type="text"
                value={formData.professor || ""}
                onChange={(e) => setFormData({ ...formData, professor: e.target.value })}
                className="w-full px-3 py-2 border border-[#e8e6dc] rounded-lg text-sm focus:outline-none focus:border-[#d97757]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#141413] mb-1.5">Department</label>
              <input
                type="text"
                value={formData.department || ""}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="w-full px-3 py-2 border border-[#e8e6dc] rounded-lg text-sm focus:outline-none focus:border-[#d97757]"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-[#141413] mb-1.5">Student Count</label>
              <input
                type="number"
                value={formData.studentCount || ""}
                onChange={(e) => setFormData({ ...formData, studentCount: parseInt(e.target.value) || undefined })}
                className="w-full px-3 py-2 border border-[#e8e6dc] rounded-lg text-sm focus:outline-none focus:border-[#d97757]"
              />
            </div>
          </>
        ) : (
          <>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-[#141413] mb-1.5">Organization Name</label>
              <input
                type="text"
                value={formData.orgName || ""}
                onChange={(e) => setFormData({ ...formData, orgName: e.target.value })}
                className="w-full px-3 py-2 border border-[#e8e6dc] rounded-lg text-sm focus:outline-none focus:border-[#d97757]"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-[#141413] mb-1.5">Organization Type</label>
              <input
                type="text"
                value={formData.orgType || ""}
                onChange={(e) => setFormData({ ...formData, orgType: e.target.value })}
                className="w-full px-3 py-2 border border-[#e8e6dc] rounded-lg text-sm focus:outline-none focus:border-[#d97757]"
              />
            </div>
          </>
        )}

        <div>
          <label className="block text-sm font-medium text-[#141413] mb-1.5">Order</label>
          <input
            type="number"
            value={formData.order}
            onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
            className="w-full px-3 py-2 border border-[#e8e6dc] rounded-lg text-sm focus:outline-none focus:border-[#d97757]"
          />
        </div>

        <div className="flex items-center gap-4 self-end pb-2">
          <label className="flex items-center gap-2 text-sm text-[#555555]">
            <input
              type="checkbox"
              checked={formData.featured}
              onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
            />
            Featured
          </label>
          <label className="flex items-center gap-2 text-sm text-[#555555]">
            <input
              type="checkbox"
              checked={formData.published}
              onChange={(e) => setFormData({ ...formData, published: e.target.checked })}
            />
            Published
          </label>
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

export default function CaseStudiesTab() {
  const [studies, setStudies] = useState<CaseStudy[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDocs(query(collection(db, "case-studies"), orderBy("order")));
        setStudies(snap.docs.map((d) => ({ id: d.id, ...d.data() } as CaseStudy)));
      } catch (err) {
        console.error("Error loading case studies:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSave = async (studyData: Omit<CaseStudy, "id">) => {
    try {
      if (editingId) {
        await updateDoc(doc(db, "case-studies", editingId), studyData);
        setStudies((prev) =>
          prev.map((s) => (s.id === editingId ? { id: editingId, ...studyData } : s))
        );
        setEditingId(null);
      } else {
        const docRef = await addDoc(collection(db, "case-studies"), studyData);
        setStudies((prev) => [...prev, { id: docRef.id, ...studyData }]);
        setIsCreating(false);
      }
    } catch (err) {
      console.error("Error saving case study:", err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this case study?")) return;
    try {
      await deleteDoc(doc(db, "case-studies", id));
      setStudies((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      console.error("Error deleting case study:", err);
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
        <h2 className="text-lg font-semibold text-[#141413]">Case Studies ({studies.length})</h2>
        <button
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#d97757] text-white text-sm font-medium rounded-lg hover:bg-[#c86843]"
        >
          <Plus size={16} />
          New Case Study
        </button>
      </div>

      {/* Create Modal */}
      {isCreating && (
        <Modal title="Create Case Study" onClose={() => setIsCreating(false)} maxWidth="max-w-2xl">
          <CaseStudyForm onSave={handleSave} onCancel={() => setIsCreating(false)} />
        </Modal>
      )}

      {/* Case Studies Table */}
      <div className="bg-white rounded-2xl border border-[#e8e6dc] overflow-hidden">
        {studies.length === 0 ? (
          <div className="p-8 text-center text-[#b0aea5]">No case studies yet. Create one to get started.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#faf9f5] border-b border-[#e8e6dc]">
                <tr>
                  <th className="px-6 py-3 text-left font-semibold text-[#555555]">Title</th>
                  <th className="px-6 py-3 text-left font-semibold text-[#555555]">Type</th>
                  <th className="px-6 py-3 text-left font-semibold text-[#555555]">Semester</th>
                  <th className="px-6 py-3 text-left font-semibold text-[#555555]">Published</th>
                  <th className="px-6 py-3 text-right font-semibold text-[#555555]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e8e6dc]">
                {studies.map((study) => (
                  <tr key={study.id} className="hover:bg-[#faf9f5] transition-colors">
                    <td className="px-6 py-4 text-[#141413] font-medium">{study.title}</td>
                    <td className="px-6 py-4 text-[#b0aea5] capitalize">{study.type}</td>
                    <td className="px-6 py-4 text-[#b0aea5]">{study.semester}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                          study.published
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {study.published ? "Yes" : "No"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                      <button
                        onClick={() => setEditingId(study.id)}
                        className="p-2 text-[#d97757] hover:bg-[#faf9f5] rounded"
                        title="Edit"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(study.id)}
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
        <Modal title="Edit Case Study" onClose={() => setEditingId(null)} maxWidth="max-w-2xl">
          <CaseStudyForm
            study={studies.find((s) => s.id === editingId)}
            onSave={handleSave}
            onCancel={() => setEditingId(null)}
          />
        </Modal>
      )}
    </div>
  );
}
