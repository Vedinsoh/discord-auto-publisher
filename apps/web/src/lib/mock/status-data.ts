export interface StatusData {
  isOnline: boolean;
  uptime: number;
  lastUpdate: Date;
  stats: {
    queueSize: number;
    queueCapacity: number;
    averageProcessingTime: number;
    messagesProcessed: number;
    activeServers: number;
  };
  rateLimit: {
    current: number;
    max: number;
    resetIn: number;
  };
}

export function generateMockStatus(): StatusData {
  const queueSize = Math.floor(Math.random() * 100) + 50;
  const rateLimit = Math.floor(Math.random() * 30) + 60;

  return {
    isOnline: true,
    uptime: 99.98,
    lastUpdate: new Date(),
    stats: {
      queueSize,
      queueCapacity: 1000,
      averageProcessingTime: 0.3,
      messagesProcessed: 1247893,
      activeServers: 17234,
    },
    rateLimit: {
      current: rateLimit,
      max: 100,
      resetIn: 60,
    },
  };
}
