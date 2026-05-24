import React from "react";
import { LogoIcon } from "./LogoIcon";

interface LogoFullProps extends React.HTMLAttributes<HTMLDivElement> {
  iconSize?: number;
}

export const LogoFull: React.FC<LogoFullProps> = ({
  iconSize = 40,
  className,
  ...props
}) => {
  return (
    <div className={`flex items-center gap-3 ${className}`} {...props}>
      <LogoIcon size={iconSize} showBackground={false} className="shrink-0" />
      <span className="text-xl font-extrabold tracking-tight md:text-2xl">
        <span className="bg-gradient-to-r from-[#FFE500] via-[#FF6A00] to-[#FF1A00] bg-clip-text text-transparent">
          Post
        </span>
        <span className="text-slate-900 dark:text-white">
          Flow
        </span>
      </span>
    </div>
  );
};
