import type { SVGProps } from "react";

/** Stroke icon from the sprite in <IconSprite/>: <Icon name="home" className="ic-sm" />. */
export function Icon({ name, className, ...rest }: { name: string; className?: string } & SVGProps<SVGSVGElement>) {
  return (
    <svg className={className ? `ic ${className}` : "ic"} aria-hidden="true" {...rest}>
      <use href={`#i-${name}`} />
    </svg>
  );
}
