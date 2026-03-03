'use client';

import { Activity, AlertCircle, CheckCircle, Clock, Server, TrendingUp, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { generateMockStatus, type StatusData } from '@/lib/mock/status-data';

function getQueueStatus(percentage: number) {
  if (percentage < 50) {
    return { color: 'text-green-400', bg: 'bg-green-500/20', status: 'Low' };
  }
  if (percentage < 80) {
    return { color: 'text-yellow-400', bg: 'bg-yellow-500/20', status: 'Moderate' };
  }
  return { color: 'text-red-400', bg: 'bg-red-500/20', status: 'High' };
}

function getRateLimitStatus(percentage: number) {
  if (percentage < 70) {
    return { color: 'text-green-400', bg: 'bg-green-500/20', status: 'Healthy' };
  }
  if (percentage < 90) {
    return { color: 'text-yellow-400', bg: 'bg-yellow-500/20', status: 'Elevated' };
  }
  return { color: 'text-orange-400', bg: 'bg-orange-500/20', status: 'Near Limit' };
}

function getProgressBarColor(percentage: number, type: 'queue' | 'rateLimit') {
  if (type === 'queue') {
    if (percentage < 50) return 'bg-green-500';
    if (percentage < 80) return 'bg-yellow-500';
    return 'bg-red-500';
  }
  if (percentage < 70) return 'bg-green-500';
  if (percentage < 90) return 'bg-yellow-500';
  return 'bg-orange-500';
}

export default function StatusPage() {
  const [status, setStatus] = useState<StatusData>(generateMockStatus);
  const [countdown, setCountdown] = useState(60);

  useEffect(() => {
    const interval = setInterval(() => {
      setStatus(generateMockStatus());
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(prev => (prev > 0 ? prev - 1 : 60));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const queuePercentage = (status.stats.queueSize / status.stats.queueCapacity) * 100;
  const rateLimitPercentage = (status.rateLimit.current / status.rateLimit.max) * 100;
  const queueStatus = getQueueStatus(queuePercentage);
  const rateLimitStatus = getRateLimitStatus(rateLimitPercentage);

  return (
    <div className="min-h-screen px-4 pt-24 pb-16">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-linear-to-r from-green-500/10 to-blue-500/10 border border-green-500/20 rounded-full text-green-400 text-sm mb-6">
            <Activity className="w-4 h-4" />
            <span>System Status</span>
          </div>
          <h1 className="text-4xl sm:text-5xl text-white mb-4">Auto Publisher Status</h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            Real-time monitoring of bot performance and service health
          </p>
        </div>

        {/* Main Status Card */}
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-linear-to-r from-green-500/20 to-blue-500/20 blur-3xl" />
          <Card className="relative bg-slate-900/50 border-green-500/30 p-8 backdrop-blur-sm">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-6">
                <div className="w-20 h-20 bg-linear-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center shadow-2xl shadow-green-500/50 animate-pulse">
                  <CheckCircle className="w-10 h-10 text-white" />
                </div>
                <div>
                  <h2 className="text-3xl text-white mb-2">All Systems Operational</h2>
                  <p className="text-slate-400">
                    Last updated: {status.lastUpdate.toLocaleTimeString()}
                  </p>
                </div>
              </div>
              <div className="text-center md:text-right">
                <div className="text-4xl text-white mb-1">{status.uptime}%</div>
                <p className="text-slate-400">Uptime (30 days)</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Stats Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-slate-900/50 border-slate-800 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <Server className="w-5 h-5 text-blue-400" />
              </div>
              <h3 className="text-slate-400">Active Servers</h3>
            </div>
            <div className="text-3xl text-white mb-1">
              {status.stats.activeServers.toLocaleString()}
            </div>
            <p className="text-slate-500 text-sm">Currently using the bot</p>
          </Card>

          <Card className="bg-slate-900/50 border-slate-800 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-purple-400" />
              </div>
              <h3 className="text-slate-400">Messages Processed</h3>
            </div>
            <div className="text-3xl text-white mb-1">
              {status.stats.messagesProcessed.toLocaleString()}
            </div>
            <p className="text-slate-500 text-sm">Total in last 24h</p>
          </Card>

          <Card className="bg-slate-900/50 border-slate-800 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                <Zap className="w-5 h-5 text-green-400" />
              </div>
              <h3 className="text-slate-400">Avg Processing Time</h3>
            </div>
            <div className="text-3xl text-white mb-1">{status.stats.averageProcessingTime}s</div>
            <p className="text-slate-500 text-sm">Per message</p>
          </Card>

          <Card className="bg-slate-900/50 border-slate-800 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div
                className={`w-10 h-10 ${queueStatus.bg} rounded-lg flex items-center justify-center`}
              >
                <Clock className={`w-5 h-5 ${queueStatus.color}`} />
              </div>
              <h3 className="text-slate-400">Queue Congestion</h3>
            </div>
            <div className={`text-3xl mb-1 ${queueStatus.color}`}>{queueStatus.status}</div>
            <p className="text-slate-500 text-sm">
              {status.stats.queueSize}/{status.stats.queueCapacity} messages
            </p>
          </Card>
        </div>

        {/* Detail Cards */}
        <div className="grid lg:grid-cols-2 gap-8 mb-8">
          {/* Queue Details */}
          <Card className="bg-slate-900/50 border-slate-800 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-white text-xl">Queue Status</h3>
              <Badge className={`${queueStatus.bg} ${queueStatus.color} border-0`}>
                {queueStatus.status}
              </Badge>
            </div>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-slate-400 text-sm">Current Queue Size</span>
                  <span className="text-white">
                    {status.stats.queueSize} / {status.stats.queueCapacity}
                  </span>
                </div>
                <div className="relative h-2 w-full overflow-hidden rounded-full bg-slate-800">
                  <div
                    className={`h-full transition-all ${getProgressBarColor(queuePercentage, 'queue')}`}
                    style={{ width: `${queuePercentage}%` }}
                  />
                </div>
              </div>
              <div className="pt-4 border-t border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Queue utilization</span>
                  <span className={queueStatus.color}>{queuePercentage.toFixed(1)}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Estimated wait time</span>
                  <span className="text-white">
                    {(status.stats.queueSize * status.stats.averageProcessingTime).toFixed(1)}s
                  </span>
                </div>
              </div>
            </div>
          </Card>

          {/* Rate Limit Status */}
          <Card className="bg-slate-900/50 border-slate-800 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-white text-xl">Discord Rate Limits</h3>
              <Badge className={`${rateLimitStatus.bg} ${rateLimitStatus.color} border-0`}>
                {rateLimitStatus.status}
              </Badge>
            </div>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-slate-400 text-sm">Rate Limit Usage</span>
                  <span className="text-white">
                    {status.rateLimit.current} / {status.rateLimit.max}
                  </span>
                </div>
                <div className="relative h-2 w-full overflow-hidden rounded-full bg-slate-800">
                  <div
                    className={`h-full transition-all ${getProgressBarColor(rateLimitPercentage, 'rateLimit')}`}
                    style={{ width: `${rateLimitPercentage}%` }}
                  />
                </div>
              </div>
              <div className="pt-4 border-t border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Usage percentage</span>
                  <span className={rateLimitStatus.color}>{rateLimitPercentage.toFixed(1)}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Resets in</span>
                  <span className="text-white font-mono">{countdown}s</span>
                </div>
                <div className="flex items-center gap-2 text-slate-500 text-sm mt-4">
                  <AlertCircle className="w-4 h-4" />
                  <span>Automatically managed by Discord API</span>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Footer Note */}
        <div className="text-center mt-8">
          <p className="text-slate-500 text-sm">
            Status updates refresh automatically every 5 seconds
          </p>
        </div>
      </div>
    </div>
  );
}
