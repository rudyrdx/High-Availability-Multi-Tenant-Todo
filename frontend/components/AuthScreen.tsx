import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckSquare, ArrowRight, Building2, User, Loader2, AlertCircle, Key, Globe, Mail, BadgePlus } from 'lucide-react';
import { api } from '../services/api';
import { Tenant } from '../types';

interface AuthScreenProps {
  onLoginSuccess: () => void;
}

const AuthScreen: React.FC<AuthScreenProps> = ({ onLoginSuccess }) => {
  const [step, setStep] = useState<'tenant' | 'user' | 'create'>('tenant');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Tenant State
  const [slug, setSlug] = useState('');
  const [foundTenant, setFoundTenant] = useState<string | null>(null);

  // User State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Create Workspace State
  const [newTenantName, setNewTenantName] = useState('');
  const [newTenantSlug, setNewTenantSlug] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [inviteKey, setInviteKey] = useState('');

  const handleTenantCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slug.trim()) return;
    setIsLoading(true);
    setError(null);

    try {
      const tenant = await api.checkTenant(slug.trim());
      setFoundTenant(tenant);
      setStep('user');
    } catch (err) {
      setError("Workspace not found. Try 'acme' or 'demo'.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    console.log('🖱️ Login button clicked');
    e.preventDefault();

    console.log('📋 Login form data:', {
      email: email.trim(),
      password: password ? '***' : 'empty',
      tenantId: foundTenant
    });

    if (!email.trim() || !password.trim() || !foundTenant) {
      console.log('❌ Login validation failed:', {
        hasEmail: !!email.trim(),
        hasPassword: !!password.trim(),
        hasTenant: !!foundTenant
      });
      return;
    }

    console.log('✅ Validation passed, calling API...');
    setIsLoading(true);
    setError(null);

    try {
      await api.login(foundTenant, email, password);
      console.log('🎉 Login successful, calling onLoginSuccess');
      onLoginSuccess();
    } catch (err: any) {
      console.error('❌ Login error:', err);
      setError(err.message || "Login failed. Please check your credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTenantName || !newTenantSlug || !newUserEmail || !password || !inviteKey) return;

    setIsLoading(true);
    setError(null);

    try {
      await api.createWorkspace(newTenantName, newTenantSlug, newUserEmail, newUserName, inviteKey, password);
      onLoginSuccess();
    } catch (err: any) {
      setError(err.message || "Failed to create workspace.");
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-generate slug from name
  const handleNameChange = (val: string) => {
    setNewTenantName(val);
    const generatedSlug = val.toLowerCase().replace(/[^a-z0-9]/g, '');
    setNewTenantSlug(generatedSlug);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">

      {/* Brand Header */}
      <motion.div
        layout
        className="flex items-center gap-3 mb-8"
      >
        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-blue-200 shadow-lg">
          <CheckSquare size={24} strokeWidth={3} />
        </div>
        <span className="text-2xl font-bold text-slate-800 tracking-tight">Chronos</span>
      </motion.div>

      <div className="w-full max-w-md relative">
        <AnimatePresence mode="wait">

          {/* STEP 1: FIND TENANT */}
          {step === 'tenant' && (
            <motion.div
              key="step-tenant"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8"
            >
              <h2 className="text-xl font-bold text-slate-900 mb-2">Find your workspace</h2>
              <p className="text-slate-500 text-sm mb-6">Enter your organization's slug to continue.</p>

              <form onSubmit={handleTenantCheck} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5 ml-1">Workspace Slug</label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      autoFocus
                      type="text"
                      value={slug}
                      onChange={(e) => setSlug(e.target.value)}
                      placeholder="e.g. acme"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-medium text-slate-800"
                    />
                  </div>
                </div>

                {error && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg">
                    <AlertCircle size={16} />
                    {error}
                  </motion.div>
                )}

                <button
                  type="submit"
                  disabled={isLoading || !slug}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg shadow-lg shadow-blue-200 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? <Loader2 className="animate-spin" size={20} /> : (
                    <>
                      Continue <ArrowRight size={18} />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-6 pt-6 border-t border-slate-100">
                <button
                  onClick={() => {
                    setError(null);
                    setStep('create');
                  }}
                  className="w-full flex items-center justify-center gap-2 text-sm text-slate-500 hover:text-blue-600 font-medium transition-colors"
                >
                  <BadgePlus size={16} />
                  Create a new workspace
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 2: USER LOGIN */}
          {step === 'user' && (
            <motion.div
              key="step-user"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8"
            >
              <button
                onClick={() => setStep('tenant')}
                className="text-xs text-slate-400 hover:text-slate-600 mb-6 flex items-center gap-1 transition-colors"
              >
                ← Back to workspace
              </button>

              <h2 className="text-xl font-bold text-slate-900 mb-1">Welcome to {slug}</h2>
              <p className="text-slate-500 text-sm mb-6">Log in to access your tasks.</p>

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5 ml-1">Email Address</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      autoFocus
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@company.com"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-medium text-slate-800"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5 ml-1">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-medium text-slate-800"
                  />
                </div>

                {error && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg">
                    <AlertCircle size={16} />
                    {error}
                  </motion.div>
                )}

                <button
                  type="submit"
                  disabled={isLoading || !email || !password}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg shadow-lg shadow-blue-200 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? <Loader2 className="animate-spin" size={20} /> : "Log In"}
                </button>
              </form>
            </motion.div>
          )}

          {/* STEP 3: CREATE WORKSPACE */}
          {step === 'create' && (
            <motion.div
              key="step-create"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8"
            >
              <button
                onClick={() => setStep('tenant')}
                className="text-xs text-slate-400 hover:text-slate-600 mb-4 flex items-center gap-1 transition-colors"
              >
                ← Cancel
              </button>

              <h2 className="text-xl font-bold text-slate-900 mb-2">Create Workspace</h2>
              <p className="text-slate-500 text-sm mb-6">Setup your organization and admin account.</p>

              <form onSubmit={handleCreateWorkspace} className="space-y-4">
                {/* Tenant Info */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5 ml-1">Workspace Name</label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input
                        type="text"
                        value={newTenantName}
                        onChange={(e) => handleNameChange(e.target.value)}
                        placeholder="My Company"
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm"
                      />
                    </div>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5 ml-1">Workspace URL</label>
                    <div className="relative">
                      <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input
                        type="text"
                        value={newTenantSlug}
                        onChange={(e) => setNewTenantSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''))}
                        placeholder="company"
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm"
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1 ml-1">app.chronos.com/{newTenantSlug || 'slug'}</p>
                  </div>
                </div>

                <div className="border-t border-slate-100 my-2"></div>

                {/* User Info */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5 ml-1">Your Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input
                        type="email"
                        value={newUserEmail}
                        onChange={(e) => setNewUserEmail(e.target.value)}
                        placeholder="you@company.com"
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm"
                      />
                    </div>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5 ml-1">Full Name</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input
                        type="text"
                        value={newUserName}
                        onChange={(e) => setNewUserName(e.target.value)}
                        placeholder="John Doe"
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5 ml-1">Password</label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1 ml-1">Minimum 8 characters</p>
                </div>

                {/* Invite Key */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5 ml-1">Invite Key</label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="text"
                      value={inviteKey}
                      onChange={(e) => setInviteKey(e.target.value)}
                      placeholder="Enter your invite key"
                      className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1 ml-1">Hint: use <code className="bg-slate-100 px-1 rounded">chronos-beta</code></p>
                </div>

                {error && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg">
                    <AlertCircle size={16} />
                    {error}
                  </motion.div>
                )}

                <button
                  type="submit"
                  disabled={isLoading || !newTenantSlug || !newUserEmail || !password || !inviteKey}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg shadow-lg shadow-blue-200 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                >
                  {isLoading ? <Loader2 className="animate-spin" size={20} /> : "Create Workspace"}
                </button>
              </form>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      <div className="mt-8 text-center text-xs text-slate-400">
        &copy; {new Date().getFullYear()} Chronos Task Manager. All rights reserved.
      </div>
    </div>
  );
};

export default AuthScreen;