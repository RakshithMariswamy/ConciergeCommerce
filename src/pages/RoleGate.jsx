/**
 * RoleGate
 * ────────
 * Simulated role-selection screen (replaces a real auth flow).
 * Sets the currentUser in useAssignmentStore and navigates to the
 * correct dashboard based on the selected role.
 */

import { useNavigate } from 'react-router-dom';
import { Shield, User, ChevronRight, Star } from 'lucide-react';
import useAssignmentStore from '../store/useAssignmentStore';
import { mockAssociates } from '../data/mockData';

// ─── ROLE PROFILES ────────────────────────────────────────────────────────────

const PROFILES = [
  {
    associateId: 'assoc-003',
    name: 'Derek Wilson',
    initials: 'DW',
    role: 'TeamLead',
    department: 'Floor Manager',
    description: 'Assign tasks, manage associates, view all queues, override assignments.',
    destination: '/lead',
    theme: {
      card: 'border-indigo-200 hover:border-indigo-400',
      icon: 'bg-indigo-600 text-white',
      badge: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      cta: 'bg-indigo-600 hover:bg-indigo-700 text-white',
      accent: 'bg-gradient-to-br from-indigo-500 to-purple-600',
      roleLabel: 'Team Lead',
      RoleIcon: Shield,
    },
  },
  {
    associateId: 'assoc-001',
    name: 'Jordan Adams',
    initials: 'JA',
    role: 'Associate',
    department: 'Womenswear',
    description: 'View your assigned tasks, serve clients, build carts, and complete requests.',
    destination: '/associate',
    theme: {
      card: 'border-amber-200 hover:border-amber-400',
      icon: 'bg-amber-500 text-white',
      badge: 'bg-amber-50 text-amber-700 border-amber-200',
      cta: 'bg-charcoal hover:bg-gray-800 text-white',
      accent: 'bg-gradient-to-br from-amber-400 to-orange-500',
      roleLabel: 'Associate',
      RoleIcon: User,
    },
  },
  {
    associateId: 'assoc-002',
    name: 'Maya Patel',
    initials: 'MP',
    role: 'Associate',
    department: 'Accessories',
    description: 'View your assigned tasks, serve clients, build carts, and complete requests.',
    destination: '/associate',
    theme: {
      card: 'border-teal-200 hover:border-teal-400',
      icon: 'bg-teal-600 text-white',
      badge: 'bg-teal-50 text-teal-700 border-teal-200',
      cta: 'bg-charcoal hover:bg-gray-800 text-white',
      accent: 'bg-gradient-to-br from-teal-400 to-emerald-500',
      roleLabel: 'Associate',
      RoleIcon: User,
    },
  },
  {
    associateId: 'assoc-006',
    name: 'Sophie Laurent',
    initials: 'SL',
    role: 'Associate',
    department: 'Womenswear',
    description: 'View your assigned tasks, serve clients, build carts, and complete requests.',
    destination: '/associate',
    theme: {
      card: 'border-rose-200 hover:border-rose-400',
      icon: 'bg-rose-500 text-white',
      badge: 'bg-rose-50 text-rose-700 border-rose-200',
      cta: 'bg-charcoal hover:bg-gray-800 text-white',
      accent: 'bg-gradient-to-br from-rose-400 to-pink-500',
      roleLabel: 'Associate',
      RoleIcon: User,
    },
  },
];

// ─── PROFILE CARD ─────────────────────────────────────────────────────────────

const ProfileCard = ({ profile, onSelect }) => {
  const { theme } = profile;
  const RoleIcon = theme.RoleIcon;

  return (
    <button
      onClick={() => onSelect(profile)}
      className={`
        group relative w-full text-left bg-white rounded-2xl border-2 shadow-luxury
        hover:shadow-luxury-hover hover:-translate-y-1
        transition-all duration-250 overflow-hidden
        ${theme.card}
      `}
    >
      {/* Gradient accent top */}
      <div className={`h-1.5 ${theme.accent}`} />

      <div className="p-5">
        {/* Avatar + role */}
        <div className="flex items-start justify-between mb-4">
          <div className={`w-12 h-12 rounded-2xl ${theme.icon} flex items-center justify-center text-base font-bold shadow-md`}>
            {profile.initials}
          </div>
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${theme.badge}`}>
            <RoleIcon size={11} strokeWidth={2} />
            {theme.roleLabel}
          </span>
        </div>

        {/* Name + dept */}
        <h3 className="font-serif text-lg font-semibold text-charcoal leading-tight">
          {profile.name}
        </h3>
        <p className="text-xs text-gray-400 font-sans mt-0.5 mb-3">{profile.department}</p>

        {/* Description */}
        <p className="text-sm text-gray-500 font-sans leading-relaxed mb-4">
          {profile.description}
        </p>

        {/* CTA */}
        <div className={`flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-semibold transition-all ${theme.cta}`}>
          Sign in as {profile.name.split(' ')[0]}
          <ChevronRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
        </div>
      </div>
    </button>
  );
};

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

const RoleGate = () => {
  const navigate = useNavigate();
  const setCurrentUser = useAssignmentStore((s) => s.setCurrentUser);

  const handleSelect = (profile) => {
    setCurrentUser({
      id: profile.associateId,
      name: profile.name,
      role: profile.role,
    });
    navigate(profile.destination, { replace: true });
  };

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      {/* Header */}
      <header className="bg-charcoal text-white py-5 px-4 shadow-xl">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <img src="/macys-logo.svg" alt="Macys" className="h-6 w-auto brightness-0 invert" />
          <div>
            <h1 className="font-serif text-xl font-light tracking-wide">Concierge Hub</h1>
            <p className="text-white/40 text-[10px] font-sans uppercase tracking-widest">
              Powered by Dynamic Task Assignment
            </p>
          </div>
        </div>
      </header>

      {/* Body */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-10">
        {/* Headline */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gold/20 border border-gold/30 text-amber-700 text-xs font-semibold font-sans mb-4">
            <Star size={11} className="fill-amber-500 text-amber-500" />
            Demo Mode — Select a role to continue
          </div>
          <h2 className="font-serif text-3xl font-medium text-charcoal leading-tight">
            Who are you today?
          </h2>
          <p className="text-gray-400 font-sans mt-2 text-sm max-w-sm mx-auto">
            Each role unlocks a tailored view of the store floor. No password required in this demo.
          </p>
        </div>

        {/* Grid: Team Lead + Associates */}
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Team Lead — full width on mobile */}
          <div className="sm:col-span-2">
            <p className="text-[10px] font-sans font-semibold uppercase tracking-widest text-gray-400 mb-2 px-1">
              Management
            </p>
            <ProfileCard profile={PROFILES[0]} onSelect={handleSelect} />
          </div>

          {/* Associates */}
          <div className="sm:col-span-2">
            <p className="text-[10px] font-sans font-semibold uppercase tracking-widest text-gray-400 mb-2 px-1 mt-4">
              Associates
            </p>
          </div>
          {PROFILES.slice(1).map((p) => (
            <ProfileCard key={p.associateId} profile={p} onSelect={handleSelect} />
          ))}
        </div>

        {/* Footer note */}
        <p className="text-center text-[11px] text-gray-300 font-sans mt-8">
          In production this screen is replaced by SSO / HR system authentication.
        </p>
      </main>
    </div>
  );
};

export default RoleGate;
