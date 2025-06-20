import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

interface TimerProps {
  startTime?: number;
  onTimeUpdate?: (time: number) => void;
  className?: string;
}

const Timer: React.FC<TimerProps> = ({ startTime = 0, onTimeUpdate, className = '' }) => {
  const [time, setTime] = useState(startTime);

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(prev => {
        const newTime = prev + 1;
        onTimeUpdate?.(newTime);
        return newTime;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [onTimeUpdate]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`flex items-center space-x-2 text-primary-600 ${className}`}>
      <Clock className="w-5 h-5" />
      <span className="font-mono text-lg font-semibold">
        {formatTime(time)}
      </span>
    </div>
  );
};

export default Timer;