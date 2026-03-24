import { toast as sonnerToast } from "sonner";

type ToastVariant = "default" | "success" | "destructive";

interface ToastOptions {
  title: string;
  description?: string;
  variant?: ToastVariant;
}

function toast({ title, description, variant = "default" }: ToastOptions) {
  if (variant === "destructive") {
    sonnerToast.error(title, { description });
  } else if (variant === "success") {
    sonnerToast.success(title, { description });
  } else {
    sonnerToast(title, { description });
  }
}

export function useToast() {
  return { toast };
}
