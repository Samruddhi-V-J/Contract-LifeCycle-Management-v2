
import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { ContractTemplate, ContractDraft } from './types';
import Navbar from './components/Navbar';
import CreateTemplate from './pages/CreateTemplate';
import GenerateDraft from './pages/GenerateDraft';

const App: React.FC = () => {
  const [templates, setTemplates] = useState<ContractTemplate[]>([]);
  const [drafts, setDrafts] = useState<ContractDraft[]>([]);

  // Add dummy data initially
  useEffect(() => {
    const dummyTemplates: ContractTemplate[] = [
      {
        id: '1',
        name: 'Standard NDA (v1)',
        content: '# Non-Disclosure Agreement\n\nThis agreement is between {{disclosing_party}} and {{receiving_party}}.\n\n## 1. Confidentiality\nThe parties agree to keep all information confidential as of {{effective_date}}.\n\n## 2. Term\nThis agreement shall remain in effect for {{duration}} years.',
        placeholders: [
          { key: 'disclosing_party', label: 'Disclosing Party', selected: true },
          { key: 'receiving_party', label: 'Receiving Party', selected: true },
          { key: 'effective_date', label: 'Effective Date', selected: true },
          { key: 'duration', label: 'Duration (Years)', selected: true }
        ],
        industry: 'Legal',
        contractType: 'Non-Disclosure Agreement',
        createdAt: new Date().toISOString()
      },
      {
        id: '2',
        name: 'SaaS Service Agreement',
        content: '# SaaS Terms of Service\n\nProvider: {{provider_name}}\nCustomer: {{customer_name}}\n\n## 1. Services\nProvider will provide services as described in {{service_description}}.\n\n## 2. Fees\nCustomer will pay {{monthly_fee}} per month.',
        placeholders: [
          { key: 'provider_name', label: 'Provider Name', selected: true },
          { key: 'customer_name', label: 'Customer Name', selected: true },
          { key: 'service_description', label: 'Service Description', selected: true },
          { key: 'monthly_fee', label: 'Monthly Fee', selected: true }
        ],
        industry: 'Technology',
        contractType: 'SaaS Terms of Service',
        createdAt: new Date().toISOString()
      },
      {
        id: '3',
        name: 'Employment Offer Letter',
        content: '# Employment Offer\n\nDear {{candidate_name}},\n\nWe are pleased to offer you the position of {{job_title}} with a starting salary of {{salary}}.\n\n## Benefits\nYou will be eligible for {{benefits_package}}.',
        placeholders: [
          { key: 'candidate_name', label: 'Candidate Name', selected: true },
          { key: 'job_title', label: 'Job Title', selected: true },
          { key: 'salary', label: 'Annual Salary', selected: true },
          { key: 'benefits_package', label: 'Benefits Package', selected: true }
        ],
        industry: 'General Business',
        contractType: 'Employment Contract',
        createdAt: new Date().toISOString()
      },
      {
        id: '4',
        name: 'Commercial Lease (Basic)',
        content: '# Commercial Lease\n\nLandlord: {{landlord_name}}\nTenant: {{tenant_name}}\n\n## Premises\nThe premises are located at {{property_address}}.\n\n## Rent\nThe monthly rent is {{rent_amount}}.',
        placeholders: [
          { key: 'landlord_name', label: 'Landlord Name', selected: true },
          { key: 'tenant_name', label: 'Tenant Name', selected: true },
          { key: 'property_address', label: 'Property Address', selected: true },
          { key: 'rent_amount', label: 'Rent Amount', selected: true }
        ],
        industry: 'Real Estate',
        contractType: 'Commercial Lease Agreement',
        createdAt: new Date().toISOString()
      }
    ];
    setTemplates(dummyTemplates);
  }, []);

  const addTemplate = (template: ContractTemplate) => {
    setTemplates(prev => [...prev, template]);
  };

  const updateTemplate = (id: string, updatedTemplate: Partial<ContractTemplate>) => {
    setTemplates(prev => prev.map(t => t.id === id ? { ...t, ...updatedTemplate } : t));
  };

  const addDraft = (draft: ContractDraft) => {
    setDrafts(prev => [...prev, draft]);
  };

  return (
    <HashRouter>
      <div className="flex h-screen bg-slate-50 overflow-hidden">
        {/* Sidebar */}
        <Navbar />

        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Header */}
          <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 flex-shrink-0">
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-indigo-800">
              LexiFlow
            </h1>
            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-semibold text-slate-700">Legal Admin</p>
                <p className="text-xs text-slate-500">Premium Account</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-indigo-100 border-2 border-indigo-500 flex items-center justify-center overflow-hidden">
                <img 
                  src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" 
                  alt="User Avatar" 
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </header>

          {/* Main Content Area */}
          <main className="flex-1 overflow-hidden">
            <Routes>
              <Route 
                path="/" 
                element={<CreateTemplate templates={templates} onSave={addTemplate} onUpdateTemplate={updateTemplate} />} 
              />
              <Route 
                path="/draft" 
                element={<GenerateDraft templates={templates} onSaveDraft={addDraft} onUpdateTemplate={updateTemplate} onSaveTemplate={addTemplate} />} 
              />
            </Routes>
          </main>
        </div>
      </div>
    </HashRouter>
  );
};

export default App;
