import React from 'react';

interface ComponentCardProps {
  title: string;
  children: React.ReactNode;
  className?: string;
  desc?: string;
  headerClassName?: string;
  bodyClassName?: string;
}

export const ComponentCard: React.FC<ComponentCardProps> = ({
  title,
  children,
  className = "",
  desc = "",
  headerClassName = "",
  bodyClassName = "",
}) => {
  return (
    <div className={`card ${className}`}>
      {/* Card Header */}
      <div className={`card-header ${headerClassName}`}>
        <h3 className="text-base font-medium text-gray-800 dark:text-white/90">
          {title}
        </h3>
        {desc && (
          <p className="mt-1 text-theme-sm text-gray-500 dark:text-gray-400">
            {desc}
          </p>
        )}
      </div>

      {/* Card Body */}
      <div className={`card-body ${bodyClassName}`}>
        <div className="space-y-6">{children}</div>
      </div>
    </div>
  );
};

export default ComponentCard;



