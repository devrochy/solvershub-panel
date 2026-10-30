import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/** Carga del Resumen: la forma de la página (pasos, período, gráfica, tabla y tarjetas), sin spinner. */
export default function DashboardLoading() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Cargando el Resumen">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <Card>
        <CardHeader className="gap-3">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-4 w-64 max-w-full" />
          <Skeleton className="h-1.5 w-full" />
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-5 w-5 rounded-pill" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-9 w-28" />
            </div>
          ))}
        </CardContent>
      </Card>
      <div className="flex flex-wrap items-center gap-2">
        <Skeleton className="h-9 w-56 rounded-md" />
        <Skeleton className="h-4 w-28" />
        <Skeleton className="ml-auto h-9 w-48 rounded-md" />
      </div>
      <Skeleton className="h-4 w-24" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-lg" />
        ))}
      </div>
      <Card>
        <CardHeader className="gap-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Skeleton className="h-7 w-56 rounded-md" />
          <Skeleton className="h-[220px] w-full rounded-md" />
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="gap-2">
          <Skeleton className="h-5 w-44" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-10 w-full rounded-sm" />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
