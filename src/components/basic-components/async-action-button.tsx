import { Button } from "@/components/ui/button";
import { LoaderCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface Props {
  isLoading?: boolean;
  variant?: "default" | "destructive" | "outline" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  asChild?: boolean;
}

export function AsyncButton({
  isLoading,
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> & Props) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [width, setWidth] = useState<number>();

  useEffect(() => {
    if (buttonRef.current && !width) {
      setWidth(buttonRef.current.offsetWidth);
    }
  }, [width]);
  return (
    <Button
      {...props}
      className={className}
      variant={variant}
      size={size}
      disabled={isLoading ?? props.disabled}
      ref={buttonRef}
      style={width ? { minWidth: `${width}px` } : undefined}
    >
      {isLoading ? (
        <LoaderCircle className="mx-auto animate-spin" />
      ) : (
        props.children
      )}
    </Button>
  );
}
