
import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const Navbar: React.FC = () => {
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === '/') return location.hash === '' || location.hash === '#/';
    return location.hash === `#${path}`;
  };

  const navItems = [
    { path: '/', label: 'Create Template', icon: 'fa-magic' },
    { path: '/draft', label: 'Generate Draft', icon: 'fa-file-signature' },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col flex-shrink-0">
      <div className="p-6">
        <div className="flex items-center gap-3 mb-8">
          <div className="bg-indigo-600 text-white p-2 rounded-xl shadow-lg shadow-indigo-200">
            <i className="fas fa-file-contract text-xl"></i>
          </div>
          <span className="text-xl font-bold text-slate-800">LexiFlow</span>
        </div>

        <nav className="space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                isActive(item.path)
                  ? 'bg-indigo-50 text-indigo-600 shadow-sm'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
              }`}
            >
              <i className={`fas ${item.icon} w-5`}></i>
              {item.label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="mt-auto p-6 border-t border-slate-100">
        <div className="bg-slate-50 rounded-2xl p-4">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">System Status</p>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-xs font-medium text-slate-600">AI Engine Online</span>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Navbar;
