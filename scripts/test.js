const test = async () => {
  const res = await fetch('https://ai-worker.dangduytoan13l.workers.dev/voice-process', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      session_id: '123',
      text: 'xin chào',
    })
  });
  const data = await res.json();
  console.log(data.audio_base64 ? 'Has audio, length: ' + data.audio_base64.length : 'NO AUDIO');
  console.log(data.error || 'No error');
};
test().catch(console.error);
