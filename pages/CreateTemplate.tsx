
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ContractTemplate, ChatMessage, INDUSTRIES } from '../types';
import { geminiService } from '../services/geminiService';
import DocumentPreview from '../components/DocumentPreview';

interface CreateTemplateProps {
  templates: ContractTemplate[];
  onSave: (template: ContractTemplate) => void;
  onUpdateTemplate: (id: string, updatedTemplate: Partial<ContractTemplate>) => void;
}

const CreateTemplate: React.FC<CreateTemplateProps> = ({ templates, onSave, onUpdateTemplate }) => {
  const navigate = useNavigate();
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
    { role: 'assistant', content: 'Hello! I am your Legal AI Assistant. Which contract template would you like to generate today?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [generatedContent, setGeneratedContent] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isApproved, setIsApproved] = useState(false);
  const [templateName, setTemplateName] = useState('My AI Template');
  const [selectedIndustry, setSelectedIndustry] = useState('');
  const [hasSetFirstName, setHasSetFirstName] = useState(false);
  const [lastUserPrompt, setLastUserPrompt] = useState('');
  const [showSaveAs, setShowSaveAs] = useState(false);
  const [saveAsName, setSaveAsName] = useState('');
  const [savedTemplateId, setSavedTemplateId] = useState<string | null>(null);
  
  // New flow states
  const [currentStep, setCurrentStep] = useState<'request' | 'industry' | 'ready'>('request');
  const [pendingContractType, setPendingContractType] = useState('');

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input;
    setInput('');
    setChatHistory(prev => [...prev, { role: 'user', content: userMessage }]);

    if (currentStep === 'request') {
      setPendingContractType(userMessage);
      setTemplateName(userMessage);
      setSaveAsName(userMessage);
      setCurrentStep('industry');
      setChatHistory(prev => [...prev, { role: 'assistant', content: 'Great! For which industry should this agreement be tailored?' }]);
    } else {
      // If they type something while in industry step, just remind them to select
      setChatHistory(prev => [...prev, { role: 'assistant', content: 'Please select an industry from the dropdown to continue.' }]);
    }
  };

  const handleIndustrySelect = async (industry: string) => {
    setSelectedIndustry(industry);
    setIsLoading(true);
    setCurrentStep('ready');
    
    setChatHistory(prev => [...prev, { role: 'assistant', content: `Generating a ${pendingContractType} for the ${industry} industry...` }]);

    try {
      const content = await geminiService.generateTemplate(`${pendingContractType} for ${industry} industry`);
      setGeneratedContent(content);
      setChatHistory(prev => [...prev, { role: 'assistant', content: 'I have generated the template for you. You can review it below, edit it manually if needed, or save it to your library.' }]);
    } catch (error) {
      setChatHistory(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error while generating your template.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenSaveAs = () => {
    if (isApproved && savedTemplateId) {
       handleFinalSave(); // Just update if already approved
    } else {
       setShowSaveAs(true);
    }
  };

  const handleFinalSave = async () => {
    if (!saveAsName.trim() && !isApproved) return;
    setIsLoading(true);
    try {
      const placeholders = await geminiService.extractPlaceholders(generatedContent);
      
      if (isApproved && savedTemplateId) {
        onUpdateTemplate(savedTemplateId, {
          content: generatedContent,
          placeholders,
          name: saveAsName || templateName
        });
        setChatHistory(prev => [...prev, { role: 'assistant', content: `Changes to "${saveAsName || templateName}" saved.` }]);
      } else {
        const newId = Math.random().toString(36).substr(2, 9);
        const newTemplate: ContractTemplate = {
          id: newId,
          name: saveAsName,
          content: generatedContent,
          placeholders,
          industry: selectedIndustry,
          contractType: pendingContractType, // Store the contract type
          createdAt: new Date().toISOString()
        };
        onSave(newTemplate);
        setSavedTemplateId(newId);
        setIsApproved(true);
        setChatHistory(prev => [...prev, { role: 'assistant', content: `Success! "${saveAsName}" is saved. You can now use it to generate drafts.` }]);
      }
      setShowSaveAs(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const renderChat = () => (
    <div className="flex flex-col h-full bg-white">
      <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-indigo-50/50">
        <h2 className="font-semibold text-indigo-900 flex items-center gap-2 text-sm uppercase tracking-wider">
          <i className="fas fa-robot text-indigo-600"></i>
          AI Agent
        </h2>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/30">
        <AnimatePresence initial={false}>
          {chatHistory.map((msg, i) => (
            <motion.div 
              key={i} 
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[85%] p-3 rounded-2xl text-sm shadow-sm ${
                msg.role === 'user' 
                  ? 'bg-indigo-600 text-white rounded-tr-none' 
                  : 'bg-white border border-slate-200 text-slate-700 rounded-tl-none'
              }`}>
                {msg.content}
              </div>
            </motion.div>
          ))}
          
          {currentStep === 'industry' && !isLoading && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-start"
            >
              <div className="bg-white border border-indigo-100 p-4 rounded-2xl shadow-md w-full max-w-[280px] space-y-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Select Industry</p>
                <div className="grid grid-cols-1 gap-2">
                  {INDUSTRIES.map(ind => (
                    <button
                      key={ind}
                      onClick={() => handleIndustrySelect(ind)}
                      className="text-left px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg border border-slate-100 transition-all"
                    >
                      {ind}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        {isLoading && (
          <div className="flex justify-start">
             <div className="bg-white border border-slate-200 p-3 rounded-2xl shadow-sm flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"></div>
                <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce delay-100"></div>
                <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce delay-200"></div>
             </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>
      <div className="p-4 bg-white border-t border-slate-100">
        <div className="relative">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSendMessage())}
            placeholder={currentStep === 'industry' ? "Select an industry above..." : "Type your request here..."}
            disabled={currentStep === 'industry'}
            className="w-full pr-12 pl-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none text-sm transition-all disabled:opacity-50"
            rows={2}
          />
          <button
            onClick={() => handleSendMessage()}
            disabled={isLoading || !input.trim() || currentStep === 'industry'}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-indigo-600 disabled:text-slate-300 hover:text-indigo-700 transition-colors"
          >
            <i className="fas fa-paper-plane text-xl"></i>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-full overflow-hidden">
      {/* 400px Width Chat Panel */}
      <div className="w-[400px] flex-shrink-0 flex flex-col border-r border-slate-200">
        {renderChat()}
      </div>

      {/* 60% Width Preview/Editor Panel */}
      <div className="flex-1 bg-slate-50 p-8 overflow-y-auto">
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="max-w-4xl mx-auto flex flex-col gap-6 h-full"
        >
          <div className="flex items-center justify-between px-2">
            <div className="flex flex-col">
              <h1 className="text-2xl font-bold text-slate-800">{templateName}</h1>
              {selectedIndustry && (
                <div className="flex items-center gap-4 mt-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Industry:</span>
                    <span className="text-xs font-bold text-indigo-600 bg-white border border-slate-200 rounded-lg px-2 py-1">
                      {selectedIndustry}
                    </span>
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              {isEditing && (
                <button 
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-all shadow-md flex items-center gap-2"
                >
                  <i className="fas fa-save"></i> Save Changes
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 min-h-[500px]">
            {generatedContent ? (
              <div className="h-full">
                {isEditing ? (
                  <div className="bg-white border border-slate-200 rounded-2xl shadow-sm h-full flex flex-col overflow-hidden">
                    <div className="bg-slate-50 border-b border-slate-200 px-6 py-3 flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-500 uppercase">Inline Editor Mode</span>
                    </div>
                    <div className="flex-1 p-12 bg-white overflow-auto">
                        <textarea 
                          className="w-full h-full font-serif leading-relaxed text-slate-800 outline-none resize-none bg-white p-0 m-0"
                          value={generatedContent}
                          onChange={(e) => setGeneratedContent(e.target.value)}
                        />
                    </div>
                  </div>
                ) : (
                  <DocumentPreview content={generatedContent} title={templateName} />
                )}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center px-6 bg-white border border-slate-200 rounded-2xl shadow-sm">
                <motion.div 
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ repeat: Infinity, duration: 4 }}
                  className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center mb-6"
                >
                  <i className="fas fa-magic text-4xl text-indigo-400"></i>
                </motion.div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">Legal AI Assistant</h3>
                <p className="max-w-md text-sm leading-relaxed text-slate-500">
                  Describe the contract you need, and our AI will generate a professional template for you. You can refine it manually afterwards.
                </p>
              </div>
            )}
          </div>

          {generatedContent && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex flex-col">
                <span className="text-sm font-bold text-slate-900">
                  {isApproved ? 'Template Finalized' : 'Finalize Template'}
                </span>
                <span className="text-xs text-slate-500">
                  {isApproved ? 'This template is saved to your library.' : 'Review and save this template to your library.'}
                </span>
              </div>
              <div className="flex gap-3 w-full sm:w-auto">
                {!isEditing && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex-1 sm:flex-initial px-6 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 font-semibold transition-all flex items-center justify-center gap-2"
                  >
                    <i className="fas fa-edit"></i>
                    Edit Manually
                  </button>
                )}
                <button
                  onClick={handleOpenSaveAs}
                  disabled={isLoading}
                  className="flex-1 sm:flex-initial px-10 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-bold transition-all shadow-lg shadow-indigo-200 active:scale-95 disabled:bg-slate-400 flex items-center justify-center gap-2"
                >
                  {isLoading ? <i className="fas fa-spinner animate-spin"></i> : <i className="fas fa-save"></i>}
                  {isApproved ? 'Save Changes' : 'Save Template'}
                </button>
                {isApproved && (
                   <button
                    onClick={() => navigate('/draft')}
                    className="flex-1 sm:flex-initial px-6 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 font-bold transition-all shadow-lg shadow-emerald-200 active:scale-95 flex items-center justify-center gap-2"
                  >
                    Draft Now
                    <i className="fas fa-arrow-right"></i>
                  </button>
                )}
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {/* Save As Modal */}
      <AnimatePresence>
        {showSaveAs && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8"
            >
              <h3 className="text-xl font-bold text-slate-800 mb-6">Save Template</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Template Name</label>
                  <input 
                    type="text" 
                    value={saveAsName}
                    onChange={(e) => setSaveAsName(e.target.value)}
                    placeholder="Enter template name..."
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Industry</label>
                  <select 
                    value={selectedIndustry}
                    onChange={(e) => setSelectedIndustry(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  >
                    {INDUSTRIES.map(ind => <option key={ind} value={ind}>{ind}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-3 mt-8">
                <button 
                  onClick={() => setShowSaveAs(false)}
                  className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleFinalSave}
                  disabled={!saveAsName.trim() || isLoading}
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

export default CreateTemplate;
