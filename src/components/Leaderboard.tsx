import { useEffect, useState } from 'react';

interface LeaderboardEntry {
  address: string;
  score: number;
}

interface LeaderboardProps {
  data: LeaderboardEntry[];
}

export function Leaderboard({ data }: LeaderboardProps) {
  // Ensure we only show top 10 even if server sends more
  const top10 = data.slice(0, 10);

  return (
    <div className="leaderboard-container">
      <h3>🏆 TOP 10 CONQUERORS</h3>
      <div className="leaderboard-list">
        {top10.length === 0 ? (
          <div className="empty-state">No tiles painted yet</div>
        ) : (
          top10.map((entry, index) => (
            <div key={entry.address} className="leaderboard-item">
              <span className="rank">#{index + 1}</span>
              <span className="address">
                {entry.address.slice(0, 6)}...{entry.address.slice(-4)}
              </span>
              <span className="score">{entry.score} TILES</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
