import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthProvider';

const resolveAvatar = (session) => {
  const tokenPhoto = typeof session?.googlePhotoUrl === 'string' ? session.googlePhotoUrl.trim() : '';
  const savedPhoto = typeof session?.profilePhotoUrl === 'string' ? session.profilePhotoUrl.trim() : '';
  return tokenPhoto || savedPhoto || '';
};

const resolveInitials = (session) => {
  const fullName = String(session?.fullName || '').trim();
  if (!fullName) {
    const email = String(session?.email || '').trim();
    return (email[0] || 'U').toUpperCase();
  }
  return fullName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');
};

function IdentityHeader() {
  const { session, role, isAuthenticated } = useAuth();
  if (!isAuthenticated || !session?.email) return null;

  const avatar = resolveAvatar(session);
  const initials = resolveInitials(session);
  return (
    <div className="px-6 pt-4 pb-2">
      <div className="rounded-xl border border-brand-navy/15 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-2 flex items-center justify-between gap-3">
        <Link to="/profile" className="flex items-center gap-3 min-w-0 hover:opacity-90 transition-opacity" aria-label="Open profile">
          {avatar ? (
            <img src={avatar} alt="Profile avatar" className="w-9 h-9 rounded-full object-cover border border-brand-navy/15 dark:border-white/15" />
          ) : (
            <div className="w-9 h-9 rounded-full bg-brand-orange/15 text-brand-orange flex items-center justify-center text-xs font-black border border-brand-orange/30">
              {initials}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-xs font-black text-brand-navy dark:text-white truncate">{session.fullName || session.email}</p>
            <p className="text-[10px] uppercase tracking-widest text-brand-navy/55 dark:text-white/55 font-black">{role}</p>
          </div>
        </Link>
      </div>
    </div>
  );
}

export default IdentityHeader;
