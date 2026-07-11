import React from 'react';
import { Users } from 'lucide-react';

interface PresenceUser {
  userId: string;
  name: string;
  email: string;
}

interface PresenceBarProps {
  onlineUsers: PresenceUser[];
  typingUsers: { [userId: string]: string }; // Map of userId -> userName of typing users
  currentUserId: string;
}

export default function PresenceBar({ onlineUsers, typingUsers, currentUserId }: PresenceBarProps) {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((part) => part[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  // Convert typingUsers map to array of names
  const typists = Object.values(typingUsers).filter(Boolean);

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-2 bg-white border-b border-[#e4e4e7] min-h-[48px]">
      {/* Online Users List */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <div className="flex items-center gap-1.5 text-xs text-zinc-500 font-medium mr-2 shrink-0">
          <Users className="w-3.5 h-3.5" />
          <span>Online ({onlineUsers.length}):</span>
        </div>
        <div className="flex -space-x-1.5 overflow-hidden">
          {onlineUsers.map((user) => {
            const isMe = user.userId === currentUserId;
            const initials = getInitials(user.name);
            return (
              <div
                key={user.userId}
                className="relative inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold ring-2 ring-white select-none transition-transform hover:scale-105 shrink-0"
                style={{
                  backgroundColor: isMe ? '#27272a' : '#e4e4e7',
                  color: isMe ? '#ffffff' : '#18181b',
                }}
                title={`${user.name} (${user.email})${isMe ? ' - Me' : ''}`}
              >
                {initials}
                <span
                  className="absolute bottom-0 right-0 block h-2 w-2 rounded-full ring-2 ring-white"
                  style={{ backgroundColor: '#22c55e' }}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Typing Indicators */}
      <div className="text-xs text-zinc-500 font-medium truncate shrink-0 max-w-[200px] sm:max-w-md h-4">
        {typists.length > 0 && (
          <span className="flex items-center gap-1">
            <span className="inline-flex gap-0.5 items-center mr-1">
              <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </span>
            {typists.length === 1
              ? `${typists[0]} is typing...`
              : typists.length === 2
              ? `${typists[0]} and ${typists[1]} are typing...`
              : 'Multiple people are typing...'}
          </span>
        )}
      </div>
    </div>
  );
}
