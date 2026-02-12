import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';

function joinClasses(...classes: Array<string | undefined | false>): string {
  return classes.filter(Boolean).join(' ');
}

const controlBaseClasses =
  'w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100';

interface FormFieldProps {
  children: ReactNode;
  className?: string;
  label?: string;
  htmlFor?: string;
  helpText?: string;
  labelClassName?: string;
  helpTextClassName?: string;
}

export function FormField({
  children,
  className,
  label,
  htmlFor,
  helpText,
  labelClassName,
  helpTextClassName,
}: FormFieldProps) {
  return (
    <div className={joinClasses('space-y-1', className)}>
      {label && (
        <label
          htmlFor={htmlFor}
          className={joinClasses('block text-sm text-gray-600 dark:text-gray-300', labelClassName)}
        >
          {label}
        </label>
      )}

      {children}

      {helpText && (
        <p className={joinClasses('text-xs text-gray-500 dark:text-gray-400', helpTextClassName)}>
          {helpText}
        </p>
      )}
    </div>
  );
}

type FormInputProps = InputHTMLAttributes<HTMLInputElement>;

export function FormInput({ className, ...props }: FormInputProps) {
  return <input {...props} className={joinClasses(controlBaseClasses, className)} />;
}

type FormSelectProps = SelectHTMLAttributes<HTMLSelectElement>;

export function FormSelect({ className, children, ...props }: FormSelectProps) {
  return (
    <select {...props} className={joinClasses(controlBaseClasses, className)}>
      {children}
    </select>
  );
}

type FormTextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

export function FormTextarea({ className, ...props }: FormTextareaProps) {
  return <textarea {...props} className={joinClasses(controlBaseClasses, className)} />;
}

type FormFileInputProps = InputHTMLAttributes<HTMLInputElement>;

export function FormFileInput({ className, ...props }: FormFileInputProps) {
  return (
    <input
      {...props}
      type="file"
      className={joinClasses('block w-full text-sm text-gray-700 dark:text-gray-200', className)}
    />
  );
}
