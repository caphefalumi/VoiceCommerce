import { useState } from 'react';

function App() {
  const [count, setCount] = useState(0);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <h1 className="text-4xl font-bold text-primary mb-8">Vite + React + shadcn/ui</h1>
      <div className="flex flex-col items-center gap-4">
        <button
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md shadow-md hover:opacity-90 transition-opacity"
          onClick={() => setCount((count) => count + 1)}
        >
          count is {count}
        </button>
        <p className="text-muted-foreground">
          Edit <code className="bg-muted px-1 rounded">src/App.tsx</code> to start building
        </p>
      </div>
    </div>
  );
}

export default App;
