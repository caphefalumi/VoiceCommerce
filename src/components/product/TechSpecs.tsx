interface TechSpecsProps {
  specs: Record<string, string>;
}

export function TechSpecs({ specs }: TechSpecsProps) {
  return (
    <div className="overflow-hidden rounded-lg border">
      <table className="w-full text-sm text-left">
        <tbody>
          {Object.entries(specs).map(([key, value], index) => (
            <tr
              key={key}
              className={`border-b last:border-0 ${index % 2 === 0 ? "bg-muted/30" : "bg-background"}`}
            >
              <td className="w-1/3 p-4 font-medium text-muted-foreground">{key}</td>
              <td className="p-4 text-foreground">{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
