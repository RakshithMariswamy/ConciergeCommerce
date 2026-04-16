// Adapter contracts for Daily.co / Twilio data channels.
// Expected shape: { send: (message) => void, subscribe: (handler) => unsubscribe }

export const createDailyAdapter = (callObject, participantId = '*') => ({
  send: (message) => {
    callObject.sendAppMessage(message, participantId);
  },

  subscribe: (handler) => {
    const onMessage = (event) => {
      const payload = event?.data ?? event;
      handler(payload);
    };

    callObject.on('app-message', onMessage);
    return () => callObject.off('app-message', onMessage);
  },
});

export const createTwilioAdapter = (localDataTrack, subscribeToRemoteTrack) => ({
  send: (message) => {
    localDataTrack.send(JSON.stringify(message));
  },

  subscribe: (handler) =>
    subscribeToRemoteTrack((raw) => {
      try {
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
        handler(parsed);
      } catch {
        // Ignore malformed payloads.
      }
    }),
});
