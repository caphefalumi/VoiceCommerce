export function ThemeTest() {
  return (
    <div className="p-8 space-y-4">
      <h1 className="text-2xl font-bold">Theme Test</h1>
      
      <div className="flex gap-4">
        <div className="p-4 bg-primary text-primary-foreground rounded-lg">
          bg-primary (Yellow)
        </div>
        
        <div className="p-4 bg-destructive text-destructive-foreground rounded-lg">
          bg-destructive (Red)
        </div>
        
        <div className="p-4 bg-background border border-border rounded-lg text-foreground">
          bg-background (Cream)
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mt-8">
        <div className="h-20 bg-primary/10 rounded">Primary/10</div>
        <div className="h-20 bg-destructive/10 rounded">Destructive/10</div>
      </div>
    </div>
  );
}
