import React, { useState, useEffect } from 'react';
import { medicalKnowledgeService, MedicalPattern } from '../services/medicalKnowledgeService';
import { X, Plus, Save, Trash2, Edit2 } from 'lucide-react';

interface KnowledgePanelProps {
    isOpen: boolean;
    onClose: () => void;
}

export const KnowledgePanel: React.FC<KnowledgePanelProps> = ({ isOpen, onClose }) => {
    const [patterns, setPatterns] = useState<MedicalPattern[]>([]);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [editForm, setEditForm] = useState<MedicalPattern>({
        symptom: '',
        associatedConditions: [],
        commonQuestions: [],
        relevanceScore: 1.0
    });

    useEffect(() => {
        if (isOpen) {
            loadPatterns();
        }
    }, [isOpen]);

    const loadPatterns = () => {
        setPatterns(medicalKnowledgeService.getPatterns());
    };

    const handleSave = () => {
        if (editingIndex !== null) {
            medicalKnowledgeService.updatePattern(editingIndex, editForm);
        } else {
            medicalKnowledgeService.addPattern(editForm);
        }
        loadPatterns();
        setEditingIndex(null);
        resetForm();
    };

    const handleDelete = (index: number) => {
        if (confirm('Tem certeza que deseja excluir este padrão?')) {
            medicalKnowledgeService.deletePattern(index);
            loadPatterns();
        }
    };

    const handleEdit = (index: number) => {
        setEditingIndex(index);
        setEditForm({ ...patterns[index] });
    };

    const resetForm = () => {
        setEditForm({
            symptom: '',
            associatedConditions: [],
            commonQuestions: [],
            relevanceScore: 1.0
        });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 w-full max-w-4xl h-[80vh] rounded-xl shadow-2xl flex flex-col overflow-hidden">
                {/* Header */}
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                        📚 Base de Conhecimento Médico
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors">
                        <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto p-6 flex gap-6">
                    {/* List */}
                    <div className="w-1/2 space-y-4">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-semibold text-gray-700 dark:text-gray-300">Padrões Cadastrados ({patterns.length})</h3>
                            <button
                                onClick={() => { setEditingIndex(null); resetForm(); }}
                                className="flex items-center gap-1 text-sm bg-primary text-white px-3 py-1.5 rounded-lg hover:bg-primary-600 transition-colors"
                            >
                                <Plus className="w-4 h-4" /> Novo Padrão
                            </button>
                        </div>

                        <div className="space-y-3">
                            {patterns.map((pattern, idx) => (
                                <div
                                    key={idx}
                                    className={`p-4 rounded-lg border cursor-pointer transition-all ${editingIndex === idx
                                            ? 'border-primary bg-primary-50 dark:bg-primary-900/20 ring-1 ring-primary'
                                            : 'border-gray-200 dark:border-gray-700 hover:border-primary/50'
                                        }`}
                                    onClick={() => handleEdit(idx)}
                                >
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h4 className="font-bold text-gray-900 dark:text-white">{pattern.symptom}</h4>
                                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                                {pattern.associatedConditions.length} condições associadas
                                            </p>
                                        </div>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleDelete(idx); }}
                                            className="text-red-500 hover:text-red-700 p-1"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Editor */}
                    <div className="w-1/2 bg-gray-50 dark:bg-gray-900/50 p-6 rounded-xl border border-gray-200 dark:border-gray-700 h-fit">
                        <h3 className="font-semibold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
                            {editingIndex !== null ? <Edit2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                            {editingIndex !== null ? 'Editar Padrão' : 'Novo Padrão'}
                        </h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Sintoma Principal
                                </label>
                                <input
                                    type="text"
                                    value={editForm.symptom}
                                    onChange={(e) => setEditForm({ ...editForm, symptom: e.target.value })}
                                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                                    placeholder="Ex: dor de cabeça"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Condições Associadas (separadas por vírgula)
                                </label>
                                <textarea
                                    value={editForm.associatedConditions.join(', ')}
                                    onChange={(e) => setEditForm({
                                        ...editForm,
                                        associatedConditions: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                                    })}
                                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent h-24"
                                    placeholder="Ex: enxaqueca, tensão, sinusite"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Perguntas Comuns (separadas por linha)
                                </label>
                                <textarea
                                    value={editForm.commonQuestions.join('\n')}
                                    onChange={(e) => setEditForm({
                                        ...editForm,
                                        commonQuestions: e.target.value.split('\n').filter(Boolean)
                                    })}
                                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent h-32"
                                    placeholder="Ex: Localização da dor?&#10;Intensidade?"
                                />
                            </div>

                            <div className="pt-4 flex justify-end gap-3">
                                <button
                                    onClick={() => { setEditingIndex(null); resetForm(); }}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={!editForm.symptom}
                                    className="px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    <Save className="w-4 h-4" />
                                    Salvar Padrão
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
