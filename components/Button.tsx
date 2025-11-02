
import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}

const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles = 'font-medium rounded-lg text-sm px-5 py-2.5 text-center transition-all duration-200';
  let variantStyles = '';
  let sizeStyles = '';

  switch (variant) {
    case 'primary':
      variantStyles = 'text-white bg-blue-600 hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800';
      break;
    case 'secondary':
      variantStyles = 'text-gray-900 bg-gray-200 hover:bg-gray-300 focus:ring-4 focus:ring-gray-300 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600 dark:focus:ring-gray-800';
      break;
    case 'outline':
      variantStyles = 'text-blue-600 border border-blue-600 hover:bg-blue-50 focus:ring-4 focus:ring-blue-300 dark:text-blue-500 dark:border-blue-500 dark:hover:bg-gray-700 dark:focus:ring-blue-800';
      break;
    case 'ghost':
      variantStyles = 'text-gray-900 hover:bg-gray-100 dark:text-white dark:hover:bg-gray-700';
      break;
  }

  switch (size) {
    case 'sm':
      sizeStyles = 'px-3 py-1.5 text-xs';
      break;
    case 'md':
      sizeStyles = 'px-5 py-2.5 text-sm';
      break;
    case 'lg':
      sizeStyles = 'px-6 py-3 text-base';
      break;
  }

  const widthStyle = fullWidth ? 'w-full' : '';
  const disabledStyles = disabled ? 'opacity-50 cursor-not-allowed' : '';

  return (
    <button
      className={`${baseStyles} ${variantStyles} ${sizeStyles} ${widthStyle} ${disabledStyles} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;
