import { useEffect, useRef, useState } from 'react';

interface FeedItem {
  id: string;
  message: string;
  timestamp: number;
}

interface LiveFeedProps {
  events: FeedItem[];
}

export function LiveFeed({ events }: LiveFeedProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [events]);

  return (
    <div className="live-feed-container">
      <h3>📜 LIVE FEED</h3>
      <div className="feed-list">
        {events.length === 0 ? (
          <div className="empty-state">Waiting for signals...</div>
        ) : (
          events.map((item) => (
            <div key={item.id} className="feed-item">
              <span className="time">
                {new Date(item.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute:'2-digit' })}
              </span>
              <span className="message">{item.message}</span>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
