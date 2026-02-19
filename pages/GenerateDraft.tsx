
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ContractTemplate, ContractDraft, INDUSTRIES, CONTRACT_TYPES, Placeholder } from '../types';
import { geminiService } from '../services/geminiService';
import DocumentPreview from '../components/DocumentPreview';

interface GenerateDraftProps {
  templates: ContractTemplate[];
  onSaveDraft: (draft: ContractDraft) => void;
  onUpdateTemplate: (id: string, updatedTemplate: Partial<ContractTemplate>) => void;
  onSaveTemplate: (template: ContractTemplate) => void;
}

const GenerateDraft: React.FC<GenerateDraftProps> = ({ templates, onSaveDraft, onUpdateTemplate, onSaveTemplate }) => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Selection States
  const [selectedIndustry, setSelectedIndustry] = useState('');
  const [selectedContractType, setSelectedContractType] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  
  // Template States
  const [currentTemplate, setCurrentTemplate] = useState<ContractTemplate | null>(null);
  const [isEditingTemplate, setIsEditingTemplate] = useState(false);
  const [editedContent, setEditedContent] = useState('');
  const [isFinalized, setIsFinalized] = useState(false);
  const [isFiltering, setIsFiltering] = useState(false);
  const [filteredTemplateContent, setFilteredTemplateContent] = useState('');
  
  // Placeholder States
  const [placeholders, setPlaceholders] = useState<Placeholder[]>([]);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  
  // Final Draft States
  const [isGenerated, setIsGenerated] = useState(false);
  const [finalContent, setFinalContent] = useState('');
  const [livePreviewContent, setLivePreviewContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Upload Save States
  const [showUploadSave, setShowUploadSave] = useState(false);
  const [uploadSaveName, setUploadSaveName] = useState('');
  const [uploadSaveIndustry, setUploadSaveIndustry] = useState('');
  const [uploadSaveContractType, setUploadSaveContractType] = useState('');
  const [pendingUploadContent, setPendingUploadContent] = useState('');
  const [pendingUploadPlaceholders, setPendingUploadPlaceholders] = useState<Placeholder[]>([]);

  // Dynamic Dropdown Data
  const availableIndustries = Array.from(new Set(templates.map(t => t.industry).filter(Boolean))) as string[];
  const availableContractTypes = Array.from(new Set(
    templates
      .filter(t => !selectedIndustry || t.industry === selectedIndustry)
      .map(t => t.contractType)
      .filter(Boolean)
  )) as string[];

  // Filtered templates based on industry AND contract type
  const filteredTemplates = templates.filter(t => 
    (!selectedIndustry || t.industry === selectedIndustry) && 
    (!selectedContractType || t.contractType === selectedContractType)
  );

  // Capitalize first letter of each word
  const capitalize = (str: string) => {
    if (!str) return '';
    return str.split(' ').map(word => {
      if (!word) return '';
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    }).join(' ');
  };

  // Live Preview Logic
  useEffect(() => {
    if (isFinalized && !isGenerated) {
      let content = filteredTemplateContent;
      placeholders.filter(p => p.selected).forEach(p => {
        const regex = new RegExp(`\\{\\{\\s*${p.key}\\s*\\}\\}`, 'gi');
        const val = formValues[p.key];
        // Use a highlighted span for live preview if it's not empty
        const replacement = val 
          ? `<span class="bg-indigo-100 text-indigo-700 px-1 rounded font-bold">${val}</span>` 
          : `{{${p.key}}}`;
        
        // Use split/join for more reliable global replacement in some browsers/cases
        content = content.split(regex).join(replacement);
      });
      setLivePreviewContent(content);
    }
  }, [formValues, isFinalized, isGenerated, filteredTemplateContent, placeholders]);

  // Sync current template when selection changes
  useEffect(() => {
    const template = templates.find(t => t.id === selectedTemplateId);
    if (template) {
      setCurrentTemplate(template);
      setEditedContent(template.content);
      setFilteredTemplateContent(template.content);
      setPlaceholders(template.placeholders.map(p => ({ ...p, selected: true })));
      setIsGenerated(false);
      setFinalContent('');
      setIsEditingTemplate(false);
      setIsFinalized(false);
      setIsFiltering(false);
    } else {
      setCurrentTemplate(null);
      setPlaceholders([]);
      setIsFinalized(false);
      setIsFiltering(false);
    }
  }, [selectedTemplateId, templates]);

  // Handle Input Changes for Draft
  const handleInputChange = (key: string, value: string) => {
    setFormValues(prev => ({ ...prev, [key]: capitalize(value) }));
  };

  // Toggle Placeholder Selection
  const togglePlaceholder = (key: string) => {
    setPlaceholders(prev => prev.map(p => 
      p.key === key ? { ...p, selected: !p.selected } : p
    ));
  };

  // Filter Template Content based on selection
  const handleFilterTemplate = async () => {
    if (!currentTemplate) return;
    setIsLoading(true);
    setIsFiltering(true);
    try {
      const unselectedKeys = placeholders.filter(p => !p.selected).map(p => p.key);
      if (unselectedKeys.length > 0) {
        const processed = await geminiService.removeUnusedClauses(editedContent, unselectedKeys);
        setFilteredTemplateContent(processed);
      } else {
        setFilteredTemplateContent(editedContent);
      }
      setIsFinalized(true);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
      setIsFiltering(false);
    }
  };

  // Handle File Upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      try {
        const content = await geminiService.generateTemplateFromText(text);
        const extractedPlaceholders = await geminiService.extractPlaceholders(content);
        
        setPendingUploadContent(content);
        setPendingUploadPlaceholders(extractedPlaceholders);
        setUploadSaveName(file.name.replace(/\.[^/.]+$/, ""));
        setUploadSaveIndustry(selectedIndustry || INDUSTRIES[0]);
        setUploadSaveContractType(selectedContractType || '');
        setShowUploadSave(true);
      } catch (err) {
        console.error(err);
        alert('Failed to process document.');
      } finally {
        setIsLoading(false);
      }
    };
    reader.readAsText(file);
  };

  const handleFinalizeUploadSave = () => {
    const newTemplate: ContractTemplate = {
      id: Math.random().toString(36).substr(2, 9),
      name: uploadSaveName,
      content: pendingUploadContent,
      placeholders: pendingUploadPlaceholders,
      industry: uploadSaveIndustry,
      contractType: uploadSaveContractType,
      createdAt: new Date().toISOString()
    };
    
    onSaveTemplate(newTemplate);
    setSelectedTemplateId(newTemplate.id);
    setShowUploadSave(false);
    setToastMessage('Template saved and ready!');
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  // Save Template Edits
  const handleSaveTemplateEdits = async () => {
    if (!currentTemplate) return;
    
    setIsLoading(true);
    try {
      const newPlaceholders = await geminiService.extractPlaceholders(editedContent);
      
      // Preserve selection state for existing keys
      const updatedPlaceholders = newPlaceholders.map(np => {
        const existing = placeholders.find(p => p.key === np.key);
        return { ...np, selected: existing ? existing.selected : true };
      });

      onUpdateTemplate(currentTemplate.id, { 
        content: editedContent, 
        placeholders: updatedPlaceholders 
      });
      setPlaceholders(updatedPlaceholders);
      setIsEditingTemplate(false);
      setToastMessage('Template updated successfully!');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Generate Draft Logic
  const handleGenerateDraft = async () => {
    if (!currentTemplate) return;

    setIsLoading(true);
    try {
      // 1. Identify unselected placeholders
      const unselectedKeys = placeholders.filter(p => !p.selected).map(p => p.key);
      
      // 2. Remove clauses associated with unselected placeholders via AI
      let processedContent = editedContent;
      if (unselectedKeys.length > 0) {
        processedContent = await geminiService.removeUnusedClauses(editedContent, unselectedKeys);
      }

      // 3. Replace selected placeholders with user values
      let content = processedContent;
      placeholders.filter(p => p.selected).forEach(p => {
        // More robust regex to catch variations in whitespace
        const regex = new RegExp(`\\{\\{\\s*${p.key}\\s*\\}\\}`, 'gi');
        const replacement = formValues[p.key] || `[${p.label.toUpperCase()}]`;
        content = content.split(regex).join(replacement);
      });

      // 4. Save the customized template as a new template (Copy)
      const templateCopyName = `${currentTemplate.name} (Customized - ${new Date().toLocaleTimeString()})`;
      const newTemplate: ContractTemplate = {
        id: Math.random().toString(36).substr(2, 9),
        name: templateCopyName,
        content: processedContent, 
        placeholders: placeholders.filter(p => p.selected),
        industry: currentTemplate.industry,
        contractType: currentTemplate.contractType, // Preserve contract type
        createdAt: new Date().toISOString()
      };
      onSaveTemplate(newTemplate);

      setFinalContent(content);
      setIsGenerated(true);
      setToastMessage('Contract draft is ready');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } catch (err) {
      console.error(err);
      alert('Failed to generate draft.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveDraft = () => {
    if (!currentTemplate) return;
    const draft: ContractDraft = {
      id: Math.random().toString(36).substr(2, 9),
      templateId: currentTemplate.id,
      name: `Draft: ${currentTemplate.name} - ${new Date().toLocaleDateString()}`,
      content: finalContent,
      values: formValues,
      createdAt: new Date().toISOString()
    };
    onSaveDraft(draft);
    
    setToastMessage('Draft successfully saved!');
    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
      setSelectedTemplateId('');
      setFormValues({});
      setIsGenerated(false);
      setFinalContent('');
    }, 2000);
  };

  return (
    <div className="flex h-full overflow-hidden relative">
      {/* Toast Notification */}
      <AnimatePresence>
        {showToast && (
          <motion.div 
            initial={{ opacity: 0, y: -50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -50, x: '-50%' }}
            className="fixed top-20 left-1/2 z-[100] bg-emerald-600 text-white px-10 py-4 rounded-xl shadow-2xl flex items-center gap-4"
          >
            <div className="bg-emerald-500 p-2 rounded-full">
              <i className="fas fa-check text-xl"></i>
            </div>
            <div>
              <span className="font-bold block text-lg">{toastMessage}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Left Selection & Form Pane */}
      <div className="w-[400px] flex-shrink-0 bg-white border-r border-slate-200 overflow-y-auto">
        <div className="p-8 space-y-8">
          {/* Step 1: Industry & Contract Selection */}
          <section className="space-y-4">
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest">1. Industry & Contract Type</label>
            <div className="grid grid-cols-1 gap-3">
                <select
                value={selectedIndustry}
                onChange={(e) => {
                  setSelectedIndustry(e.target.value);
                  setSelectedContractType('');
                  setSelectedTemplateId('');
                }}
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm shadow-sm transition-all"
              >
                <option value="">-- Select Industry --</option>
                {availableIndustries.map(ind => <option key={ind} value={ind}>{ind}</option>)}
              </select>

              <select
                value={selectedContractType}
                onChange={(e) => setSelectedContractType(e.target.value)}
                disabled={!selectedIndustry}
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm shadow-sm disabled:opacity-50 transition-all"
              >
                <option value="">-- Select Contract Type --</option>
                {availableContractTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
          </section>

          {/* Step 2: Template Selection or Upload */}
          <section className="space-y-4">
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest">2. Choose Template Source</label>
            <div className="space-y-3">
              <select
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm shadow-sm transition-all"
              >
                <option value="">-- Select Existing Template --</option>
                {filteredTemplates.map(t => (
                  <option key={t.id} value={t.id}>{t.name} ({t.industry})</option>
                ))}
              </select>

              <div className="flex items-center gap-2 py-2">
                <div className="flex-1 h-px bg-slate-100"></div>
                <span className="text-[10px] text-slate-300 font-bold uppercase tracking-widest">Or</span>
                <div className="flex-1 h-px bg-slate-100"></div>
              </div>

              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
                className="hidden" 
                accept=".txt,.doc,.docx,.md"
              />
              <motion.button
                whileHover={{ scale: 1.02, backgroundColor: '#f8fafc' }}
                whileTap={{ scale: 0.98 }}
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
                className="w-full py-8 border-2 border-dashed border-indigo-100 bg-indigo-50/20 text-indigo-600 rounded-2xl text-sm font-bold hover:border-indigo-300 transition-all flex flex-col items-center justify-center gap-3 group"
              >
                {isLoading ? (
                  <i className="fas fa-spinner animate-spin text-2xl"></i>
                ) : (
                  <>
                    <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <i className="fas fa-cloud-upload-alt text-xl"></i>
                    </div>
                    <div className="text-center">
                      <span className="block">Upload Existing Document</span>
                      <span className="text-[10px] font-normal text-slate-400">PDF, DOCX, or TXT supported</span>
                    </div>
                  </>
                )}
              </motion.button>
            </div>
          </section>

          {/* Step 3: Variable Selection */}
          {currentTemplate && !isFinalized && (
            <motion.section 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest">3. Select Variables</label>
                <button 
                  onClick={() => setIsEditingTemplate(!isEditingTemplate)}
                  className="text-[10px] font-bold text-indigo-600 hover:underline uppercase transition-colors"
                >
                  {isEditingTemplate ? 'Cancel' : 'Edit Template'}
                </button>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto p-4 border border-slate-100 rounded-2xl bg-slate-50/50">
                {placeholders.map(p => (
                  <label key={p.key} className="flex items-center gap-3 p-3 bg-white border border-slate-100 rounded-xl cursor-pointer transition-all hover:border-indigo-300 group">
                    <input 
                      type="checkbox" 
                      checked={p.selected} 
                      onChange={() => togglePlaceholder(p.key)}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm text-slate-700 font-semibold group-hover:text-indigo-600 transition-colors">{p.label}</span>
                  </label>
                ))}
              </div>

              <button
                onClick={handleFilterTemplate}
                disabled={isLoading}
                className="w-full py-4 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 font-bold transition-all shadow-xl shadow-indigo-100 active:scale-95 flex items-center justify-center gap-2 group disabled:opacity-50"
              >
                {isLoading ? <i className="fas fa-spinner animate-spin"></i> : 'Finalize Selection'}
                <i className="fas fa-check-circle group-hover:scale-110 transition-transform"></i>
              </button>
            </motion.section>
          )}

          {/* Step 4: Data Entry */}
          {currentTemplate && isFinalized && (
            <motion.section 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest">4. Data Entry</label>
                <button 
                  onClick={() => setIsFinalized(false)}
                  className="text-[10px] font-bold text-slate-400 hover:text-slate-600 uppercase transition-colors"
                >
                  Change Selection
                </button>
              </div>

              <div className="space-y-4 bg-slate-50 p-6 rounded-2xl border border-slate-100 shadow-inner">
                {placeholders.filter(p => p.selected).map((p) => (
                  <div key={p.key} className="space-y-1.5">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-tight pl-1">{p.label}</label>
                    <input
                      type="text"
                      value={formValues[p.key] || ''}
                      onChange={(e) => handleInputChange(p.key, e.target.value)}
                      placeholder={`Enter ${p.label}...`}
                      className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none text-sm transition-all shadow-sm"
                    />
                  </div>
                ))}
              </div>

              <button
                onClick={handleGenerateDraft}
                disabled={isLoading}
                className="w-full py-4 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 font-bold transition-all shadow-xl shadow-indigo-100 active:scale-95 flex items-center justify-center gap-2 group disabled:opacity-50"
              >
                {isLoading ? <i className="fas fa-spinner animate-spin"></i> : 'Generate Final Draft'}
                <i className="fas fa-bolt group-hover:scale-110 transition-transform"></i>
              </button>
            </motion.section>
          )}
        </div>
      </div>

      {/* Right Preview Pane */}
      <div className="flex-1 bg-slate-50 p-8 overflow-y-auto">
        {currentTemplate ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-4xl mx-auto h-full flex flex-col gap-6"
          >
            <div className="flex-1 min-h-[500px]">
              <div className="flex flex-col h-full">
                <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${isGenerated ? 'bg-emerald-100 text-emerald-700' : isEditingTemplate ? 'bg-indigo-100 text-indigo-700' : isFinalized ? 'bg-indigo-50 text-indigo-600' : 'bg-amber-100 text-amber-700'}`}>
                          {isGenerated ? 'Draft Preview' : isEditingTemplate ? 'Editing Template' : isFinalized ? 'Filtered Template' : 'Original Template'}
                      </span>
                    </div>
                    {isEditingTemplate && (
                      <button 
                        onClick={handleSaveTemplateEdits}
                        disabled={isLoading}
                        className="px-6 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 flex items-center gap-2"
                      >
                        {isLoading ? <i className="fas fa-spinner animate-spin"></i> : <i className="fas fa-save"></i>}
                        Save Changes
                      </button>
                    )}
                </div>
                
                {isEditingTemplate ? (
                  <div className="flex-1 bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden flex flex-col">
                    <div className="bg-slate-50 border-b border-slate-200 px-6 py-3 flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-500 uppercase">Template Editor</span>
                    </div>
                    <textarea 
                      className="flex-1 p-12 font-mono text-sm text-slate-800 outline-none resize-none leading-relaxed"
                      value={editedContent}
                      onChange={(e) => setEditedContent(e.target.value)}
                    />
                  </div>
                ) : (
                  <DocumentPreview 
                    content={isGenerated ? finalContent : (isFinalized ? livePreviewContent : editedContent)} 
                    title={isGenerated ? `Draft: ${currentTemplate.name}` : `Template: ${currentTemplate.name}`} 
                  />
                )}
              </div>
            </div>
            
            {isGenerated && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-end p-6 bg-white border border-slate-200 rounded-3xl shadow-sm"
              >
                  <button
                    onClick={handleSaveDraft}
                    className="px-12 py-4 bg-emerald-600 text-white rounded-2xl hover:bg-emerald-700 font-bold transition-all shadow-xl shadow-emerald-100 active:scale-95 flex items-center gap-2"
                  >
                    <i className="fas fa-cloud-upload-alt"></i>
                    Save Final Draft
                  </button>
              </motion.div>
            )}
          </motion.div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center px-6">
            <motion.div 
              animate={{ y: [0, -10, 0] }}
              transition={{ repeat: Infinity, duration: 3 }}
              className="w-24 h-24 bg-white border border-slate-200 rounded-full flex items-center justify-center mb-6 shadow-sm"
            >
              <i className="fas fa-file-invoice text-3xl text-slate-300"></i>
            </motion.div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Drafting Workspace</h3>
            <p className="max-w-xs text-sm text-slate-500 leading-relaxed">Select an industry and contract type to find templates, or upload your own document to begin drafting.</p>
          </div>
        )}
      </div>

      {/* Upload Save Modal */}
      <AnimatePresence>
        {showUploadSave && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8"
            >
              <h3 className="text-xl font-bold text-slate-800 mb-6">Save Uploaded Template</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Template Name</label>
                  <input 
                    type="text" 
                    value={uploadSaveName}
                    onChange={(e) => setUploadSaveName(e.target.value)}
                    placeholder="Enter template name..."
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Industry</label>
                  <select 
                    value={uploadSaveIndustry}
                    onChange={(e) => setUploadSaveIndustry(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  >
                    {INDUSTRIES.map(ind => <option key={ind} value={ind}>{ind}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Contract Type</label>
                  <input 
                    type="text" 
                    value={uploadSaveContractType}
                    onChange={(e) => setUploadSaveContractType(e.target.value)}
                    placeholder="e.g. SaaS Agreement"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-8">
                <button 
                  onClick={() => setShowUploadSave(false)}
                  className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleFinalizeUploadSave}
                  disabled={!uploadSaveName.trim() || isLoading}
                  className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 disabled:opacity-50"
                >
                  {isLoading ? <i className="fas fa-spinner animate-spin"></i> : 'Save Template'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GenerateDraft;
