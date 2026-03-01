"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
  LayoutDashboard,
  Wallet,
  PieChart as PieChartIcon,
  Trash2,
  ShieldAlert,
  LogOut,
  PlusCircle,
  X,
  Edit2,
  Eye,
  EyeOff,
  Menu,
  User,
  Settings,
  ShieldCheck,
  TrendingUp,
  TrendingDown
} from 'lucide-react';

// --- 0. KOMPONENTE: AUTH-SCREEN ---
// --- 0. KOMPONENTE: AUTH-SCREEN ---
function AuthScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isSignUp) {
        // 1. SCHRITT: Prüfen, ob der Einladungscode existiert und noch frei ist
        const { data: codeData, error: codeError } = await supabase
          .from('invite_codes')
          .select('*')
          .eq('code', inviteCode.toUpperCase().trim())
          .is('used_by', null)
          .single();

        if (codeError || !codeData) {
          throw new Error('Ungültiger oder bereits verwendeter Einladungscode.');
        }

        // 2. SCHRITT: Registrierung durchführen
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName }
          }
        });
        if (authError) throw authError;

        // 3. SCHRITT: Code entwerten
        if (authData.user) {
          await supabase
            .from('invite_codes')
            .update({ used_by: authData.user.id })
            .eq('id', codeData.id);
        }

        alert('Registrierung erfolgreich! Bitte melden Sie sich an.');
        setIsSignUp(false);
        setInviteCode('');
      } else {
        const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
        if (loginError) throw loginError;
      }
    } catch (err: any) {
      setError(err.message || 'Ein Fehler ist aufgetreten');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-black text-white">
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-900/20 to-black items-center justify-center p-12">
        <div className="max-w-md text-center">
          <div className="w-20 h-20 bg-blue-600 rounded-2xl flex items-center justify-center shadow-2xl mx-auto mb-8">
            <Wallet size={40} />
          </div>
          <h1 className="text-5xl font-black mb-4 tracking-tight">FINANCELY</h1>
          <p className="text-xl text-zinc-400 leading-relaxed">Professionelle Budget-Verwaltung für Event-Konten.</p>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center p-6 lg:w-1/2">
        <div className="w-full max-w-md">
          <h2 className="text-3xl font-black mb-2">{isSignUp ? 'Account erstellen' : 'Anmelden'}</h2>
          <form onSubmit={handleAuth} className="space-y-4">
            {isSignUp && (
              <>
                <input
                  type="text"
                  placeholder="Vollständiger Name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 p-4 rounded-xl text-white outline-none focus:border-blue-500"
                  required
                />
                <input
                  type="text"
                  placeholder="Einladungscode"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  className="w-full bg-zinc-950 border-2 border-blue-600/30 p-4 rounded-xl text-blue-400 font-mono font-bold outline-none focus:border-blue-500 placeholder:text-zinc-700"
                  required
                />
              </>
            )}
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 p-4 rounded-xl text-white outline-none focus:border-blue-500"
              required
            />
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Passwort"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 p-4 rounded-xl text-white outline-none focus:border-blue-500 pr-12"
                required
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-600">
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {error && <p className="text-red-500 text-sm font-medium">{error}</p>}
            <button disabled={loading} className="w-full bg-blue-600 py-4 rounded-xl font-bold uppercase tracking-widest hover:bg-blue-500 transition-all active:scale-[0.98] disabled:opacity-50">
              {loading ? 'Laden...' : isSignUp ? 'Registrieren' : 'Anmelden'}
            </button>
          </form>
          <button onClick={() => setIsSignUp(!isSignUp)} className="w-full text-zinc-500 mt-4 text-sm hover:text-white transition-colors">
            {isSignUp ? 'Schon ein Konto? Hier anmelden' : 'Noch kein Konto? Hier registrieren'}
          </button>
        </div>
      </div>
    </div>
  );
}

// --- 1. KOMPONENTE: KONTEN VERWALTEN ---
function AccountsManager({ isAdmin }: { isAdmin: boolean }) {
  const [accounts, setAccounts] = useState<{ id: string; name: string; budget_limit: number }[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newLimit, setNewLimit] = useState('');

  const fetchAccounts = async () => {
    const { data } = await supabase.from('event_accounts').select('*').order('name');
    if (data) setAccounts(data);
  };

  useEffect(() => { fetchAccounts(); }, []);

  const handleSave = async () => {
    if (!newName) return;
    const payload = { name: newName, budget_limit: parseFloat(newLimit) || 0 };
    const { error } = editingAccountId 
      ? await supabase.from('event_accounts').update(payload).eq('id', editingAccountId)
      : await supabase.from('event_accounts').insert([payload]);
    
    if (!error) { closeModal(); fetchAccounts(); }
  };

  const closeModal = () => { setIsModalOpen(false); setEditingAccountId(null); setNewName(''); setNewLimit(''); };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-xl font-bold">Aktive Event-Konten</h2>
        {isAdmin && (
          <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:scale-105 transition-all">
            <PlusCircle size={20} /> Neues Konto
          </button>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {accounts.map(acc => (
          <div key={acc.id} className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl">
            <div className="flex justify-between mb-4">
              <span className="font-bold text-lg">{acc.name}</span>
              {isAdmin && (
                <div className="flex gap-2">
                  <button onClick={() => { setEditingAccountId(acc.id); setNewName(acc.name); setNewLimit(acc.budget_limit.toString()); setIsModalOpen(true); }} className="text-zinc-600 hover:text-blue-400"><Edit2 size={16}/></button>
                  <button onClick={async () => { if(confirm('Löschen?')) { await supabase.from('event_accounts').delete().eq('id', acc.id); fetchAccounts(); } }} className="text-zinc-600 hover:text-red-500"><Trash2 size={16}/></button>
                </div>
              )}
            </div>
            <p className="text-2xl font-mono font-bold text-emerald-400">{acc.budget_limit.toLocaleString('de-DE')} €</p>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-[2rem] w-full max-w-md relative">
            <button onClick={closeModal} className="absolute right-6 top-6 text-zinc-500"><X size={24} /></button>
            <h3 className="text-2xl font-bold mb-6">{editingAccountId ? 'Konto ändern' : 'Neues Konto'}</h3>
            <input className="w-full bg-zinc-950 border border-zinc-800 p-4 rounded-xl mb-4 text-white outline-none focus:border-blue-500" placeholder="Name" value={newName} onChange={e => setNewName(e.target.value)} />
            <input type="number" className="w-full bg-zinc-950 border border-zinc-800 p-4 rounded-xl mb-6 text-white outline-none focus:border-blue-500" placeholder="Limit in €" value={newLimit} onChange={e => setNewLimit(e.target.value)} />
            <button onClick={handleSave} className="w-full bg-blue-600 py-4 rounded-xl font-bold">Speichern</button>
          </div>
        </div>
      )}
    </div>
  );
}

// --- 2. KOMPONENTE: ADMIN MANAGER (Optimiert & Clean) ---
function AdminManager({ currentUserRole }: { currentUserRole: string | undefined }) {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteCode, setInviteCode] = useState<string | null>(null);

  // Sicherheits-Check: Nur Admins dürfen den Inhalt sehen
  if (!currentUserRole || currentUserRole.toLowerCase() !== 'admin') {
    return (
      <div className="bg-zinc-900/50 border border-red-500/20 p-12 rounded-[2.5rem] text-center">
        <ShieldAlert size={48} className="mx-auto text-red-500 mb-4" />
        <h2 className="text-xl font-black text-white italic">ZUGRIFF VERWEIGERT</h2>
        <p className="text-zinc-500 text-sm mt-2">
          Du hast keine Berechtigung für diesen Bereich.
        </p>
      </div>
    );
  }

  const fetchProfiles = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('full_name', { ascending: true });
    
    if (data) setProfiles(data);
    setLoading(false);
  };

  useEffect(() => { 
    fetchProfiles(); 
  }, [currentUserRole]);

  const generateInviteCode = async () => {
    const newCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const { error } = await supabase.from('invite_codes').insert([{ code: newCode }]);

    if (error) {
      alert("Fehler beim Erstellen des Codes: " + error.message);
    } else {
      setInviteCode(newCode);
    }
  };

  const toggleRole = async (id: string, currentRole: string) => {
    const newRole = currentRole === 'admin' ? 'employee' : 'admin';
    const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', id);
    if (!error) fetchProfiles();
  };

  const deleteUser = async (id: string) => {
    if (!confirm("Profil wirklich löschen? Der User verliert sofort den Zugriff.")) return;
    const { error } = await supabase.from('profiles').delete().eq('id', id);
    if (!error) fetchProfiles();
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* HEADER & CODE GENERATOR */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-zinc-900/30 p-8 rounded-[2.5rem] border border-zinc-800">
        <div>
          <h2 className="text-2xl font-black italic">BENUTZER-STAMM</h2>
          <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-[0.2em] mt-1">
            Einladungen & Rollen kontrollieren
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          {inviteCode && (
            <div className="bg-amber-500/10 border border-amber-500/20 px-4 py-2 rounded-xl flex items-center gap-3">
              <span className="text-zinc-400 text-[10px] font-bold uppercase">Code:</span>
              <span className="text-amber-500 font-mono font-bold tracking-widest">{inviteCode}</span>
            </div>
          )}
          <button 
            onClick={generateInviteCode}
            className="bg-amber-500 hover:bg-amber-400 text-black px-6 py-3 rounded-2xl font-black text-xs uppercase transition-all active:scale-95 flex items-center gap-2"
          >
            <PlusCircle size={16} /> Code erstellen
          </button>
        </div>
      </div>

      {/* PROFIL TABELLE */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-[2.5rem] overflow-hidden shadow-2xl">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900/80">
              <th className="p-6 text-zinc-500 text-[10px] font-black uppercase tracking-widest">Mitarbeiter</th>
              <th className="p-6 text-zinc-500 text-[10px] font-black uppercase tracking-widest text-center">Status / Rolle</th>
              <th className="p-6 text-right text-zinc-500 text-[10px] font-black uppercase tracking-widest">Verwaltung</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/50">
            {profiles.map(profile => (
              <tr key={profile.id} className="hover:bg-zinc-800/20 transition-colors">
                <td className="p-6">
                  {/* Zeigt Namen an, oder einen Hinweis, wenn noch kein Profil ausgefüllt wurde */}
                  <p className="font-bold text-white text-lg">
                    {profile.full_name || "Unvollständiges Profil"}
                  </p>
                  <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-tighter">
                    Registriert am {new Date(profile.created_at || Date.now()).toLocaleDateString('de-DE')}
                  </p>
                </td>
                <td className="p-6 text-center">
                  <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-tighter ${
                    profile.role === 'admin' 
                      ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20' 
                      : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                  }`}>
                    {profile.role}
                  </span>
                </td>
                <td className="p-6 text-right">
                  <div className="flex justify-end gap-2">
                    <button 
                      onClick={() => toggleRole(profile.id, profile.role)}
                      className="p-3 hover:bg-blue-500/10 text-zinc-500 hover:text-blue-400 rounded-xl transition-all"
                      title="Rolle ändern"
                    >
                      <ShieldCheck size={20} />
                    </button>
                    <button 
                      onClick={() => deleteUser(profile.id)}
                      className="p-3 hover:bg-red-500/10 text-zinc-500 hover:text-red-500 rounded-xl transition-all"
                      title="Benutzer löschen"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {loading && (
          <div className="p-12 text-center text-zinc-600 animate-pulse text-xs font-black uppercase tracking-widest">
            Synchronisiere Datenbank...
          </div>
        )}
      </div>
    </div>
  );
}

// --- 3. HAUPT-KOMPONENTE ---
export default function BudgetApp() {
  const [user, setUser] = useState<{ email: string; role: string; id: string; full_name?: string } | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  
  const [profileName, setProfileName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);

  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [bookingDesc, setBookingDesc] = useState('');
  const [bookingAmount, setBookingAmount] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [bookingType, setBookingType] = useState<'expense' | 'income'>('expense');
  const [vendor, setVendor] = useState('Sonstiges');
  
  const [availableAccounts, setAvailableAccounts] = useState<any[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setUser({ email: session.user.email ?? '', role: 'employee', id: session.user.id });
        fetchUserRole(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        setUser({ email: session.user.email ?? '', role: 'employee', id: session.user.id });
        fetchUserRole(session.user.id);
      } else {
        setUser(null);
      }
    });
    return () => subscription?.unsubscribe();
  }, []);

  const fetchUserRole = async (uid: string) => {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', uid).maybeSingle();
    if (!data && !error) {
      await supabase.from('profiles').insert([{ id: uid, role: 'employee' }]);
    } else if (data) {
      setUser(prev => prev ? { ...prev, role: data.role, full_name: data.full_name } : null);
      setProfileName(data.full_name || '');
    }
  };

  const updateProfile = async () => {
    setProfileLoading(true);
    try {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ full_name: profileName })
        .eq('id', user?.id);
      
      if (profileError) throw profileError;

      if (newPassword) {
        const { error: pwdError } = await supabase.auth.updateUser({ password: newPassword });
        if (pwdError) throw pwdError;
      }

      alert("Profil erfolgreich aktualisiert!");
      setIsProfileModalOpen(false);
      setNewPassword('');
      if (user) setUser({ ...user, full_name: profileName });
    } catch (err: any) {
      alert("Fehler: " + err.message);
    } finally {
      setProfileLoading(false);
    }
  };

  const fetchData = async () => {
    const { data: accData } = await supabase.from('event_accounts').select('*').order('name');
    if (accData) setAvailableAccounts(accData);
    const { data: transData } = await supabase.from('transactions').select(`*, event_accounts(name)`).order('created_at', { ascending: false });
    if (transData) setRecentTransactions(transData);
  };

  useEffect(() => { if (user) fetchData(); }, [user, activeTab]);

  const handleSaveBooking = async () => {
    if (!bookingDesc || !bookingAmount || !selectedAccountId) return alert("Pflichtfelder!");
    const payload = { 
      description: bookingDesc, 
      amount: parseFloat(bookingAmount.replace(',', '.')), 
      account_id: selectedAccountId, 
      vendor, 
      user_id: user?.id,
      type: bookingType 
    };
    const { error } = editingId 
      ? await supabase.from('transactions').update(payload).eq('id', editingId)
      : await supabase.from('transactions').insert([payload]);
    
    if (!error) { 
        setIsBookingModalOpen(false); 
        setEditingId(null); 
        setBookingType('expense'); 
        fetchData(); 
    }
  };

  if (!user) return <AuthScreen />;

  return (
    <div className="flex flex-col md:flex-row h-screen bg-black text-white overflow-hidden font-sans">
      
      {/* Sidebar */}
      <aside className={`${isMobileMenuOpen ? 'flex' : 'hidden'} md:flex absolute md:relative z-40 w-full md:w-64 h-[calc(100vh-65px)] md:h-screen flex-col border-r border-zinc-800 p-6 gap-8 bg-zinc-950 transition-all`}>
        <div className="flex items-center gap-3 px-2">
           <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center"><Wallet size={20}/></div> 
           <span className="font-bold text-xl italic tracking-tight">FINANCELY</span>
        </div>
        <nav className="flex-1 space-y-2">
          <button onClick={() => { setActiveTab('dashboard'); setIsMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 p-3 rounded-xl ${activeTab === 'dashboard' ? 'bg-zinc-800' : 'text-zinc-500'}`}><LayoutDashboard size={20}/> Dashboard</button>
          <button onClick={() => { setActiveTab('accounts'); setIsMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 p-3 rounded-xl ${activeTab === 'accounts' ? 'bg-zinc-800' : 'text-zinc-500'}`}><PieChartIcon size={20}/> Event-Konten</button>
          {user.role === 'admin' && (
             <button onClick={() => { setActiveTab('admin'); setIsMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${activeTab === 'admin' ? 'bg-amber-500 text-black font-bold' : 'text-zinc-500 hover:text-amber-500'}`}><ShieldCheck size={20}/> Admin Bereich</button>
          )}
        </nav>
        
        <div className="mt-auto space-y-4">
          <button onClick={() => setIsProfileModalOpen(true)} className="flex items-center gap-3 p-3 w-full text-zinc-400 hover:text-white transition-colors bg-zinc-900 rounded-xl">
            <Settings size={18}/> Profil & Sicherheit
          </button>
          <button onClick={() => supabase.auth.signOut()} className="text-zinc-500 hover:text-red-400 flex items-center gap-2 p-3"><LogOut size={18}/> Abmelden</button>
        </div>
      </aside>

      <main className="flex-1 p-4 md:p-10 overflow-y-auto bg-black">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-12 gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
                {activeTab === 'dashboard' ? 'Übersicht' : activeTab === 'accounts' ? 'Konten' : 'Verwaltung'}
            </h1>
            <p className="text-zinc-500 mt-2">Willkommen zurück, <span className="text-blue-400 font-bold">{user.full_name || user.email.split('@')[0]}</span>!</p>
          </div>
          {activeTab === 'dashboard' && (
            <button onClick={() => { setEditingId(null); setBookingDesc(''); setBookingAmount(''); setIsBookingModalOpen(true); }} className="w-full sm:w-auto bg-blue-600 px-6 py-3.5 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-blue-500 shadow-lg transition-all">
              <PlusCircle size={20}/> Transaktion buchen
            </button>
          )}
        </header>

        {activeTab === 'dashboard' ? (
          <div className="space-y-12">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {availableAccounts.map(acc => {
                const income = recentTransactions.filter(t => t.account_id === acc.id && t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0);
                const spent = recentTransactions.filter(t => t.account_id === acc.id && (t.type === 'expense' || !t.type)).reduce((sum, t) => sum + Number(t.amount), 0);
                
                const limit = acc.budget_limit || 0;
                const currentBalance = limit + income - spent;
                const percent = limit > 0 ? (spent / (limit + income)) * 100 : 0;

                return (
                  <div key={acc.id} className="bg-zinc-900 border border-zinc-800 p-6 rounded-[2rem]">
                    <h3 className="font-bold mb-4 text-zinc-300 uppercase text-xs tracking-widest">{acc.name}</h3>
                    <div className="flex justify-between items-end mb-3">
                      <span className={`text-2xl font-mono font-bold ${currentBalance < 0 ? 'text-red-500' : 'text-white'}`}>
                        {currentBalance.toLocaleString('de-DE')} €
                      </span>
                      <span className="text-zinc-500 text-[10px]">VERFÜGBAR</span>
                    </div>
                    <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
                      <div className={`h-full transition-all duration-700 ${percent >= 90 ? 'bg-red-500' : 'bg-blue-500'}`} style={{ width: `${Math.min(percent, 100)}%` }}></div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="bg-zinc-900/40 border border-zinc-800 rounded-[2.5rem] overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[600px]">
                  <tbody>
                    {recentTransactions.map((t) => (
                      <tr key={t.id} className="group hover:bg-zinc-800/30 border-b border-zinc-800/50 last:border-0 transition-colors">
                        <td className="p-7">
                          <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-xl ${t.type === 'income' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                                {t.type === 'income' ? <TrendingUp size={20}/> : <TrendingDown size={20}/>}
                            </div>
                            <div>
                                <p className="font-bold text-lg">{t.description}</p>
                                <p className="text-xs text-zinc-500 uppercase tracking-wider">{t.vendor} • {new Date(t.created_at).toLocaleDateString('de-DE')}</p>
                            </div>
                          </div>
                        </td>
                        <td className={`p-7 text-right font-mono font-bold text-xl ${t.type === 'income' ? 'text-emerald-400' : 'text-zinc-300'}`}>
                            {t.type === 'income' ? '+' : '-'}{t.amount.toLocaleString('de-DE')} €
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
          </div>
) : activeTab === 'accounts' ? (
  <AccountsManager isAdmin={user.role === 'admin'} />
) : activeTab === 'admin' && user.role === 'admin' ? (
  /* FIX: Hier wird die Rolle jetzt korrekt an die Komponente übergeben */
  <AdminManager currentUserRole={user.role} />
) : (
  /* Fallback, falls ein Employee irgendwie auf den Admin-Tab gelangt */
  <div className="p-10 text-center text-zinc-500">
    Zugriff verweigert.
  </div>
)}
</main>

      {/* PROFIL MODAL */}
      {isProfileModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-md p-10 rounded-[3rem] relative shadow-2xl">
            <button onClick={() => setIsProfileModalOpen(false)} className="absolute right-6 top-6 text-zinc-500 hover:text-white"><X size={24}/></button>
            <h2 className="text-2xl font-black mb-1">PROFIL & SICHERHEIT</h2>
            <p className="text-zinc-500 text-sm mb-8">Passe deine Kontoeinstellungen an.</p>
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-zinc-500 mb-2 uppercase">Anzeigename</label>
                <input className="w-full bg-zinc-950 border border-zinc-800 p-4 rounded-2xl text-white outline-none focus:border-blue-500" value={profileName} onChange={e => setProfileName(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-500 mb-2 uppercase">Neues Passwort</label>
                <input type="password" className="w-full bg-zinc-950 border border-zinc-800 p-4 rounded-2xl text-white outline-none focus:border-blue-500" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
              </div>
              <button onClick={updateProfile} disabled={profileLoading} className="w-full bg-blue-600 py-5 rounded-2xl font-black text-white hover:bg-blue-500 transition-all uppercase tracking-widest">
                {profileLoading ? 'Speichern...' : 'Übernehmen'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BUCHUNGS MODAL */}
      {isBookingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-md p-10 rounded-[3rem] relative">
            <button onClick={() => setIsBookingModalOpen(false)} className="absolute right-6 top-6 text-zinc-500"><X size={24}/></button>
            
            <h2 className="text-2xl font-black mb-6">BUCHUNG ERFASSEN</h2>
            
            <div className="flex bg-zinc-950 p-1 rounded-2xl border border-zinc-800 mb-6">
              <button 
                onClick={() => setBookingType('expense')}
                className={`flex-1 py-3 rounded-xl font-bold transition-all ${bookingType === 'expense' ? 'bg-red-600 text-white' : 'text-zinc-500'}`}
              >
                Ausgabe
              </button>
              <button 
                onClick={() => setBookingType('income')}
                className={`flex-1 py-3 rounded-xl font-bold transition-all ${bookingType === 'income' ? 'bg-emerald-600 text-white' : 'text-zinc-500'}`}
              >
                Einnahme
              </button>
            </div>

            <div className="space-y-4">
              <select className="w-full bg-zinc-950 border border-zinc-800 p-5 rounded-2xl text-white outline-none focus:border-blue-500" value={selectedAccountId} onChange={e => setSelectedAccountId(e.target.value)}>
                <option value="">Konto auswählen...</option>
                {availableAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
              <input className="w-full bg-zinc-950 border border-zinc-800 p-5 rounded-2xl text-white outline-none focus:border-blue-500" placeholder="Beschreibung" value={bookingDesc} onChange={e => setBookingDesc(e.target.value)} />
              <input className="w-full bg-zinc-950 border border-zinc-800 p-5 rounded-2xl text-white outline-none focus:border-blue-500 font-mono" placeholder="Betrag €" value={bookingAmount} onChange={e => setBookingAmount(e.target.value)} />
              
              <button onClick={handleSaveBooking} className={`w-full py-5 rounded-2xl font-black uppercase tracking-widest transition-all ${bookingType === 'income' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-blue-600 hover:bg-blue-500'}`}>
                {bookingType === 'income' ? 'Einnahme buchen' : 'Ausgabe bestätigen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}