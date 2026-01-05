"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Play, Pause, RotateCcw, Coffee, Brain,
  Volume2, VolumeX, Settings, X, Minimize2, Maximize2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

type TimerType = "focus" | "short_break" | "long_break";

const TIMER_SETTINGS = {
  focus: { duration: 25, label: "Focus", color: "from-red-500 to-orange-500" },
  short_break: { duration: 5, label: "Short Break", color: "from-green-500 to-emerald-500" },
  long_break: { duration: 15, label: "Long Break", color: "from-blue-500 to-cyan-500" },
};

interface PomodoroTimerProps {
  taskId?: string;
  taskTitle?: string;
  onSessionComplete?: (type: TimerType, minutes: number) => void;
  className?: string;
}

export function PomodoroTimer({
  taskId,
  taskTitle,
  onSessionComplete,
  className,
}: PomodoroTimerProps) {
  const [timerType, setTimerType] = useState<TimerType>("focus");
  const [timeLeft, setTimeLeft] = useState(TIMER_SETTINGS.focus.duration * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [sessionsCompleted, setSessionsCompleted] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const settings = TIMER_SETTINGS[timerType];
  const totalSeconds = settings.duration * 60;
  const progress = ((totalSeconds - timeLeft) / totalSeconds) * 100;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const playSound = useCallback(() => {
    if (soundEnabled && typeof window !== "undefined") {
      // Create a simple beep sound using Web Audio API
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 800;
        oscillator.type = "sine";
        gainNode.gain.value = 0.3;
        
        oscillator.start();
        setTimeout(() => {
          oscillator.stop();
          audioContext.close();
        }, 200);
      } catch (e) {
        console.log("Audio not supported");
      }
    }
  }, [soundEnabled]);

  const handleComplete = useCallback(async () => {
    playSound();
    setIsRunning(false);

    if (timerType === "focus") {
      setSessionsCompleted((prev) => prev + 1);
      
      // Save session to API
      try {
        await fetch("/api/focus", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            completed: true,
            actualMinutes: settings.duration,
          }),
        });
      } catch (e) {
        console.error("Failed to save focus session:", e);
      }

      onSessionComplete?.(timerType, settings.duration);

      // Auto-switch to break
      const nextType = sessionsCompleted > 0 && (sessionsCompleted + 1) % 4 === 0 
        ? "long_break" 
        : "short_break";
      setTimerType(nextType);
      setTimeLeft(TIMER_SETTINGS[nextType].duration * 60);
    } else {
      // Break complete, switch back to focus
      setTimerType("focus");
      setTimeLeft(TIMER_SETTINGS.focus.duration * 60);
    }
  }, [timerType, sessionsCompleted, playSound, onSessionComplete, settings.duration]);

  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, timeLeft, handleComplete]);

  const handleStart = async () => {
    if (!isRunning && timerType === "focus") {
      // Start a new focus session
      try {
        await fetch("/api/focus", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            taskId,
            duration: settings.duration,
            type: timerType,
          }),
        });
      } catch (e) {
        console.error("Failed to start focus session:", e);
      }
    }
    setIsRunning(true);
  };

  const handlePause = () => {
    setIsRunning(false);
  };

  const handleReset = () => {
    setIsRunning(false);
    setTimeLeft(settings.duration * 60);
  };

  const handleTypeChange = (type: TimerType) => {
    setIsRunning(false);
    setTimerType(type);
    setTimeLeft(TIMER_SETTINGS[type].duration * 60);
  };

  if (isMinimized) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className={cn(
          "fixed bottom-4 right-4 z-50",
          className
        )}
      >
        <Card className="shadow-lg">
          <CardContent className="p-3 flex items-center gap-3">
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center bg-gradient-to-br",
              settings.color
            )}>
              {timerType === "focus" ? (
                <Brain className="h-5 w-5 text-white" />
              ) : (
                <Coffee className="h-5 w-5 text-white" />
              )}
            </div>
            <div>
              <p className="font-mono text-lg font-bold">{formatTime(timeLeft)}</p>
              <p className="text-xs text-muted-foreground">{settings.label}</p>
            </div>
            <div className="flex gap-1">
              {isRunning ? (
                <Button size="icon" variant="ghost" onClick={handlePause}>
                  <Pause className="h-4 w-4" />
                </Button>
              ) : (
                <Button size="icon" variant="ghost" onClick={handleStart}>
                  <Play className="h-4 w-4" />
                </Button>
              )}
              <Button size="icon" variant="ghost" onClick={() => setIsMinimized(false)}>
                <Maximize2 className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={className}
    >
      <Card className="overflow-hidden">
        <CardContent className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <div className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br",
                settings.color
              )}>
                {timerType === "focus" ? (
                  <Brain className="h-4 w-4 text-white" />
                ) : (
                  <Coffee className="h-4 w-4 text-white" />
                )}
              </div>
              <div>
                <h3 className="font-semibold">{settings.label}</h3>
                {taskTitle && (
                  <p className="text-xs text-muted-foreground truncate max-w-[150px]">
                    {taskTitle}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setSoundEnabled(!soundEnabled)}
              >
                {soundEnabled ? (
                  <Volume2 className="h-4 w-4" />
                ) : (
                  <VolumeX className="h-4 w-4" />
                )}
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setIsMinimized(true)}
              >
                <Minimize2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Timer Type Tabs */}
          <div className="flex gap-2 mb-6">
            {(Object.keys(TIMER_SETTINGS) as TimerType[]).map((type) => (
              <Button
                key={type}
                variant={timerType === type ? "default" : "outline"}
                size="sm"
                onClick={() => handleTypeChange(type)}
                className="flex-1 text-xs"
              >
                {TIMER_SETTINGS[type].label}
              </Button>
            ))}
          </div>

          {/* Timer Display */}
          <div className="relative flex items-center justify-center mb-6">
            <div className="relative w-48 h-48">
              {/* Progress Ring */}
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="96"
                  cy="96"
                  r="88"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="8"
                  className="text-muted/20"
                />
                <circle
                  cx="96"
                  cy="96"
                  r="88"
                  fill="none"
                  stroke="url(#gradient)"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 88}
                  strokeDashoffset={2 * Math.PI * 88 * (1 - progress / 100)}
                  className="transition-all duration-1000"
                />
                <defs>
                  <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor={timerType === "focus" ? "#ef4444" : timerType === "short_break" ? "#22c55e" : "#3b82f6"} />
                    <stop offset="100%" stopColor={timerType === "focus" ? "#f97316" : timerType === "short_break" ? "#10b981" : "#06b6d4"} />
                  </linearGradient>
                </defs>
              </svg>
              
              {/* Time Display */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-mono text-4xl font-bold">{formatTime(timeLeft)}</span>
                <span className="text-sm text-muted-foreground">{settings.label}</span>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-3">
            <Button variant="outline" size="icon" onClick={handleReset}>
              <RotateCcw className="h-4 w-4" />
            </Button>
            
            {isRunning ? (
              <Button
                size="lg"
                onClick={handlePause}
                className={cn("w-24 bg-gradient-to-r", settings.color)}
              >
                <Pause className="h-5 w-5" />
              </Button>
            ) : (
              <Button
                size="lg"
                onClick={handleStart}
                className={cn("w-24 bg-gradient-to-r", settings.color)}
              >
                <Play className="h-5 w-5" />
              </Button>
            )}

            <Badge variant="secondary" className="ml-2">
              {sessionsCompleted} sessions
            </Badge>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

