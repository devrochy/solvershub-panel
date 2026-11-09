// next/navigation fuera de Next: ruta fija y router inerte.
const nada = () => {};

export const usePathname = () => "/";
export const useSearchParams = () => new URLSearchParams();
export const useParams = () => ({});
export const useRouter = () => ({ push: nada, replace: nada, refresh: nada, back: nada, forward: nada, prefetch: nada });
export const redirect = nada;
export const notFound = nada;
