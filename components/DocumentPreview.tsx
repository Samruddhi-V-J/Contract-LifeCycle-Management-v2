
import React from 'react';

interface DocumentPreviewProps {
  content: string;
  title?: string;
}

const DocumentPreview: React.FC<DocumentPreviewProps> = ({ content, title }) => {
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden flex flex-col h-full">
      <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex justify-between items-center">
        <h3 className="font-semibold text-slate-700">{title || 'Document Preview'}</h3>
        <div className="flex gap-2">
            <span className="w-3 h-3 rounded-full bg-slate-300"></span>
            <span className="w-3 h-3 rounded-full bg-slate-300"></span>
            <span className="w-3 h-3 rounded-full bg-slate-300"></span>
        </div>
      </div>
      <div className="flex-1 overflow-auto p-8 bg-slate-100">
        <div className="bg-white mx-auto p-12 min-h-full shadow-lg max-w-[800px] border border-slate-200 rounded-sm">
          <div 
            className="prose prose-slate max-w-none whitespace-pre-wrap font-serif text-slate-800 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: content || "No content generated yet..." }}
          />
        </div>
      </div>
    </div>
  );
};

export default DocumentPreview;
