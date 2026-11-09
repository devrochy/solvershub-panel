// next/link fuera de Next: un <a> normal. Las vistas previas no navegan.
const React = window.React;

// Props de next/link que un <a> no entiende.
const SOLO_DE_NEXT = ["prefetch", "replace", "scroll", "shallow", "passHref", "legacyBehavior", "locale"];

const Link = React.forwardRef(function Link({ href, ...props }, ref) {
  const resto = Object.fromEntries(Object.entries(props).filter(([clave]) => !SOLO_DE_NEXT.includes(clave)));
  const url = typeof href === "string" ? href : (href && href.pathname) || "#";
  return React.createElement("a", {
    ...resto,
    href: url,
    ref,
    onClick: (e) => {
      e.preventDefault();
      if (resto.onClick) resto.onClick(e);
    },
  });
});

export default Link;
