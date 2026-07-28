import toast, { Toaster, type ToastOptions } from "react-hot-toast";

/**
 * Toasts portal outside #root but still live under <html data-theme>, so the
 * semantic CSS vars resolve. Keep <AppToaster/> a sibling of <App/> — moving it
 * under a provider that scopes theming would break that.
 */
export function AppToaster() {
  return (
    <Toaster
      position="top-right"
      gutter={10}
      toastOptions={{
        duration: 3500,
        className:
          "!bg-surface-1/90 !text-fg !border !border-border-subtle !shadow-e4 !rounded-lg !backdrop-blur-md !text-sm !font-medium !px-3.5 !py-2.5",
        success: { iconTheme: { primary: "var(--color-success-500)", secondary: "var(--surface-1)" } },
        error: {
          duration: 5000,
          iconTheme: { primary: "var(--color-danger-500)", secondary: "var(--surface-1)" },
        },
      }}
    />
  );
}

export const notify = {
  success: (message: string, opts?: ToastOptions) => toast.success(message, opts),
  error: (message: string, opts?: ToastOptions) => toast.error(message, opts),
  info: (message: string, opts?: ToastOptions) => toast(message, opts),
  promise: <T,>(
    promise: Promise<T>,
    msgs: { loading: string; success: string | ((v: T) => string); error: string | ((e: unknown) => string) }
  ) => toast.promise(promise, msgs),
};
